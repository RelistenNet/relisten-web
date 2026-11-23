import 'server-only';

import { cache as timberCache } from '@timber-js/app/cache';
import { cache as requestCache } from 'react';
import { deny } from '@timber-js/app/server';
import { unwrap } from '@/api/fetcher';
import { postApiV4CatalogResolve } from '@/api/generated/client';
import type { PlayableTrack, ShowSummary } from '@/domain/types';
import {
  type FollowedPlaylistHeadWire,
  type LibrarySnapshotWire,
  type PlaylistContent,
  type PlaylistSnapshotWire,
  type PlaylistSummaryWire,
  type PublicPlaylistListWire,
  type PublicPlaylistSnapshotWire,
  toPlaylistContent,
} from '@/domain/playlists';
import {
  USER_SERVICE_TIMEOUT_MS,
  USER_SERVICE_URL,
  userServiceRoutingHeaders,
} from '@/lib/session/config';
import { oneLine } from '@/lib/guideMarkdown/plain';
import { sanitizeGuide } from '@/lib/guideMarkdown/sanitize';
import { sessionCookie } from '@/lib/session/sessionCookie';
import { toTrack } from './adapters';
import { MINUTES } from './resource';
import { UserServiceError, userServiceFetch } from './session';
import { toShowSummary } from './summaries';

// Playlists live in the User Service (docs/browser-session.md). A listener's own
// playlists are per-user, so those reads forward the session cookie and are
// never cached across requests. A published playlist is public: its snapshot is
// cached briefly, like the edge does. Track details come from the catalog
// resolver, cached per playlist revision.

async function userServiceJson<T>(path: string): Promise<T> {
  const res = await userServiceFetch(path);
  if (!res.ok) throw new UserServiceError(res.status, path);
  return (await res.json()) as T;
}

// --- The listener's own ------------------------------------------------------

export type PlaylistLibrary = {
  /** Owned playlists, most recently updated first. */
  owned: PlaylistSummaryWire[];
  followed: FollowedPlaylistHeadWire[];
};

// Keyed on the token, as getCurrentUser is.
const libraryForSession = requestCache(async (_token: string): Promise<PlaylistLibrary | null> => {
  try {
    const snapshot = await userServiceJson<LibrarySnapshotWire>('/v1/library/snapshot');
    return {
      owned: [...(snapshot.playlists ?? [])].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at)
      ),
      followed: snapshot.followed_playlists ?? [],
    };
  } catch (err) {
    if (err instanceof UserServiceError && err.status === 401) return null;
    throw err;
  }
});

/**
 * The signed-in listener's playlists, or null when signed out. Throws when the
 * User Service is down or erroring.
 */
export async function getPlaylistLibrary(): Promise<PlaylistLibrary | null> {
  const token = sessionCookie.get();
  return token ? libraryForSession(token) : null;
}

export type OwnPlaylist =
  | {
      kind: 'found';
      playlist: PlaylistContent;
      archived: boolean;
      /** Set while it's published (and the share code the public page uses). */
      publicCode?: string;
      /** Its share code, published or not (it keeps one once it's had one). */
      shareCode?: string;
      /** Taken down after a report: not public, and can't be published again for now. */
      takenDown: boolean;
    }
  | { kind: 'missing' }
  | { kind: 'signed-out' };

/**
 * One of the listener's own playlists. Missing covers someone else's, too: the
 * User Service answers 404 for both. Throws when it's down or erroring.
 */
export const getOwnPlaylist = requestCache(async (playlistId: string): Promise<OwnPlaylist> => {
  if (!sessionCookie.get()) return { kind: 'signed-out' };
  try {
    const snapshot = await userServiceJson<PlaylistSnapshotWire>(
      `/v1/playlists/${encodeURIComponent(playlistId)}/snapshot`
    );
    return {
      kind: 'found',
      playlist: toPlaylistContent(snapshot),
      archived: snapshot.archived,
      publicCode: (snapshot.published && snapshot.public_code) || undefined,
      shareCode: snapshot.public_code ?? undefined,
      takenDown: !!snapshot.taken_down,
    };
  } catch (err) {
    if (err instanceof UserServiceError) {
      if (err.status === 401) return { kind: 'signed-out' };
      if (err.status === 404) return { kind: 'missing' };
    }
    throw err;
  }
});

/**
 * The User Service couldn't answer: unreachable or timed out (fetch rejects) or
 * failing (5xx). Not a refusal (4xx), which means something about the request.
 */
function isOutage(err: unknown): boolean {
  if (err instanceof UserServiceError) return err.status >= 500;
  return (
    err instanceof TypeError ||
    (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError'))
  );
}

/**
 * For a page's read's `.catch`: a User Service outage is a 503, with the page's
 * shell and a way to try again (`(content)/503.tsx`), not a 500. Anything else
 * is rethrown as it was.
 */
export function denyIfUnavailable(err: unknown): never {
  if (isOutage(err))
    deny(503, { dangerouslyPassData: { title: 'Playlists aren’t available right now' } });
  throw err;
}

// --- Published ---------------------------------------------------------------

/** `creator`: the username of the listener who made it. */
export type PublicPlaylist = PlaylistContent & { publicCode: string; creator: string };

/**
 * No stale-while-revalidate: a takedown has to reach readers within a minute,
 * and a stale entry could be served to the first reader long after it expired.
 * Sent without cookies, so the response is the same for everyone.
 */
const publicPlaylistCached = timberCache.data(
  async (code: string): Promise<PublicPlaylist | null> => {
    const path = `/v1/public-playlists/${encodeURIComponent(code)}`;
    const res = await fetch(`${USER_SERVICE_URL}${path}`, {
      headers: { accept: 'application/json', ...userServiceRoutingHeaders() },
      cache: 'no-store',
      signal: AbortSignal.timeout(USER_SERVICE_TIMEOUT_MS),
    });
    // Missing, private, archived and taken down all read the same.
    if (res.status === 404) return null;
    if (!res.ok) throw new UserServiceError(res.status, path);
    const snapshot = (await res.json()) as PublicPlaylistSnapshotWire;
    return {
      ...toPlaylistContent(snapshot),
      publicCode: snapshot.public_code,
      creator: snapshot.owner.username,
    };
  },
  {
    ttl: 60,
    key: (code: string) => publicPlaylistTag(code),
    // Publishing or unpublishing clears it at once (refreshPublicPlaylist).
    tags: (code: string) => [publicPlaylistTag(code)],
  }
);

/** The public page's cache tag, by share code. */
export const publicPlaylistTag = (code: string) => `playlist-public:${code}`;

/** A published playlist by its share code, or null when it isn't (or is no longer) public. */
export const getPublicPlaylist = requestCache((code: string) => publicPlaylistCached(code));

// --- Public listing ----------------------------------------------------------

/** Where one of the creator's own playlists stands, as its page shows it. */
export type OwnPlaylistStatus = 'published' | 'private' | 'archived' | 'taken-down';

/**
 * A row of the playlists listing, every published one or the listener's own.
 * Fields a source doesn't give are absent: the library has no creator (it's
 * them), length, plays or followers. Plain data: the value is cached.
 */
export type PlaylistListRow = {
  playlistId: string;
  /** The `/playlists/[playlist]` param: the share code (published) or the id (their own). */
  playlist: string;
  name: string;
  /** The description as one line of plain text (published only). */
  summary?: string;
  /** The username of the listener who made it. */
  creator?: string;
  trackCount: number;
  /** Seconds. */
  duration?: number;
  updatedAt: string;
  followerCount?: number;
  /** Plays started from it over the last 30 days. */
  recentPlayCount?: number;
  /** The listener's own only. */
  status?: OwnPlaylistStatus;
};

/** The listener's own playlists as listing rows, by id (their page shows their controls). */
export const ownPlaylistRows = (owned: PlaylistSummaryWire[]): PlaylistListRow[] =>
  owned.map((p) => ({
    playlistId: p.playlist_id,
    playlist: p.playlist_id,
    name: p.name,
    trackCount: p.track_count ?? p.entry_count,
    updatedAt: p.updated_at,
    status: p.taken_down
      ? 'taken-down'
      : p.archived
        ? 'archived'
        : p.published
          ? 'published'
          : 'private',
  }));

/** The sorts the listing offers: last update, plays over the last 30 days, followers. */
export type PublicPlaylistSort = 'recent' | 'plays' | 'followers';

export type PublicPlaylistPage = {
  rows: PlaylistListRow[];
  /** The next page's cursor (valid only with the same sort), or null on the last page. */
  nextCursor: string | null;
};

type PageQuery = { sort: PublicPlaylistSort; artist: string; cursor: string };

const LISTING_PAGE_SIZE = 50;

/**
 * One page of the listing, sorted and paged by the User Service. Cookieless, so
 * the same for everyone, and cached for the minute a takedown may take to show,
 * like the snapshot. A refused query (422) throws, so nothing is cached for it.
 */
const publicPlaylistPageCached = timberCache.data(
  async ({ sort, artist, cursor }: PageQuery): Promise<PublicPlaylistPage> => {
    const query = new URLSearchParams({ sort, limit: String(LISTING_PAGE_SIZE) });
    if (artist) query.set('artist', artist);
    if (cursor) query.set('cursor', cursor);
    const res = await fetch(`${USER_SERVICE_URL}/v1/public-playlists?${query}`, {
      headers: { accept: 'application/json', ...userServiceRoutingHeaders() },
      cache: 'no-store',
      signal: AbortSignal.timeout(USER_SERVICE_TIMEOUT_MS),
    });
    if (!res.ok) throw new UserServiceError(res.status, '/v1/public-playlists');
    const body = (await res.json()) as PublicPlaylistListWire;
    return {
      rows: body.playlists.map((p) => ({
        playlistId: p.playlist_id,
        playlist: p.public_code,
        name: p.name,
        summary: p.description
          ? oneLine(sanitizeGuide(p.description, { kind: 'playlist' })) || undefined
          : undefined,
        creator: p.owner.username,
        trackCount: p.track_count,
        duration: p.duration_seconds,
        updatedAt: p.updated_at,
        followerCount: p.follower_count,
        recentPlayCount: p.recent_play_count,
      })),
      nextCursor: body.next_cursor,
    };
  },
  {
    ttl: 60,
    key: ({ sort, artist, cursor }: PageQuery) => `playlist-listing:${sort}:${artist}:${cursor}`,
  }
);

/**
 * A page of published playlists: every one, or (`artist`, an `artist_…` id)
 * those with at least one of the artist's tracks. Null when the User Service
 * refused the query (a cursor from another sort, or a made-up one); throws when
 * it's down.
 */
export const getPublicPlaylistPage = requestCache(
  async (sort: PublicPlaylistSort, artist?: string, cursor?: string) => {
    try {
      return await publicPlaylistPageCached({ sort, artist: artist ?? '', cursor: cursor ?? '' });
    } catch (err) {
      if (err instanceof UserServiceError && err.status === 422) return null;
      throw err;
    }
  }
);

// --- Catalog -----------------------------------------------------------------

/** What the catalog knows about a playlist's tracks. Plain objects: the value is cached. */
export type PlaylistCatalog = {
  /** By track id. A track the catalog didn't return is unavailable. */
  tracks: Record<string, PlayableTrack & { showId: string }>;
  /** By show id. */
  shows: Record<string, ShowSummary>;
};

const RESOLVE_CHUNK = 500;

async function resolveTracks(trackIds: string[]): Promise<PlaylistCatalog> {
  const unique = [...new Set(trackIds)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += RESOLVE_CHUNK) {
    chunks.push(unique.slice(i, i + RESOLVE_CHUNK));
  }
  const results = await Promise.all(
    chunks.map((ids) =>
      unwrap(
        postApiV4CatalogResolve({
          references: ids.map((id) => ({ kind: 'track', scheme: 'v4', id })),
        })
      )
    )
  );
  const catalog: PlaylistCatalog = { tracks: {}, shows: {} };
  for (const { entities } of results) {
    for (const t of entities.tracks ?? []) {
      const { id, sourceId, title, slug, duration, mp3Url } = toTrack(t);
      catalog.tracks[id] = { id, sourceId, title, slug, duration, mp3Url, showId: t.show_id };
    }
    for (const s of entities.shows ?? []) {
      const show = toShowSummary(s);
      if (show) catalog.shows[show.id] = show;
    }
  }
  return catalog;
}

/**
 * Keyed by playlist, history generation and revision: together they name one
 * fixed set of tracks (a restore can reuse a revision number, never a generation).
 */
const catalogCached = timberCache.data(
  (_playlist: string, trackIds: string[]) => resolveTracks(trackIds),
  {
    ttl: 5 * MINUTES,
    key: (playlist: string) => `v4:playlist-catalog:${playlist}`,
    staleWhileRevalidate: true,
  }
);

export function getPlaylistCatalog(playlist: PlaylistContent): Promise<PlaylistCatalog> {
  const trackIds = playlist.segments.flatMap((s) =>
    s.entries.flatMap((e) => (e.trackId ? [e.trackId] : []))
  );
  if (trackIds.length === 0) return Promise.resolve({ tracks: {}, shows: {} });
  return catalogCached(
    `${playlist.playlistId}:${playlist.generation}:${playlist.revision}`,
    trackIds
  );
}
