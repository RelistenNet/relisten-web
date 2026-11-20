import 'server-only';

import { cache as timberCache } from '@timber-js/app/cache';
import { cache as requestCache } from 'react';
import { unwrap } from '@/api/fetcher';
import { postApiV4CatalogResolve } from '@/api/generated/client';
import type { PlayableTrack, ShowSummary } from '@/domain/types';
import type {
  FollowedPlaylistHeadWire,
  LibrarySnapshotWire,
  PlaylistSegmentWire,
  PlaylistSnapshotWire,
  PlaylistSummaryWire,
  PublicPlaylistSnapshotWire,
} from '@/domain/playlists';
import { USER_SERVICE_TIMEOUT_MS, USER_SERVICE_URL } from '@/lib/session/config';
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

/** A playlist's authored content, cut down to what pages read. Segments and entries in play order. */
export type PlaylistContent = {
  playlistId: string;
  generation: string;
  revision: number;
  name: string;
  description?: string;
  segments: {
    id: string;
    description?: string;
    entries: { id: string; trackId: string | null; description?: string }[];
  }[];
};

const text = (s: string | null | undefined) => (s?.trim() ? s : undefined);

function toContent(
  s: Pick<
    PlaylistSnapshotWire,
    'playlist_id' | 'history_generation' | 'revision' | 'metadata' | 'segments'
  >
): PlaylistContent {
  return {
    playlistId: s.playlist_id,
    generation: s.history_generation,
    revision: s.revision,
    name: s.metadata.name,
    description: text(s.metadata.description),
    segments: s.segments.map((seg: PlaylistSegmentWire) => ({
      id: seg.segment_id,
      description: text(seg.description),
      entries: seg.entries.map((e) => ({
        id: e.entry_id,
        trackId: e.track_id,
        description: text(e.description),
      })),
    })),
  };
}

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
  | { kind: 'found'; playlist: PlaylistContent; archived: boolean; publicCode?: string }
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
      playlist: toContent(snapshot),
      archived: snapshot.archived,
      publicCode: (snapshot.published && snapshot.public_code) || undefined,
    };
  } catch (err) {
    if (err instanceof UserServiceError) {
      if (err.status === 401) return { kind: 'signed-out' };
      if (err.status === 404) return { kind: 'missing' };
    }
    throw err;
  }
});

// --- Published ---------------------------------------------------------------

export type PublicPlaylist = PlaylistContent & { publicCode: string; owner: string };

/**
 * No stale-while-revalidate: a takedown has to reach readers within a minute,
 * and a stale entry could be served to the first reader long after it expired.
 * Sent without cookies, so the response is the same for everyone.
 */
const publicPlaylistCached = timberCache.data(
  async (code: string): Promise<PublicPlaylist | null> => {
    const path = `/v1/public-playlists/${encodeURIComponent(code)}`;
    const res = await fetch(`${USER_SERVICE_URL}${path}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(USER_SERVICE_TIMEOUT_MS),
    });
    // Missing, private, archived and taken down all read the same.
    if (res.status === 404) return null;
    if (!res.ok) throw new UserServiceError(res.status, path);
    const snapshot = (await res.json()) as PublicPlaylistSnapshotWire;
    return {
      ...toContent(snapshot),
      publicCode: snapshot.public_code,
      owner: snapshot.owner.username,
    };
  },
  { ttl: 60, key: (code: string) => `playlist-public:${code}` }
);

/** A published playlist by its share code, or null when it isn't (or is no longer) public. */
export const getPublicPlaylist = requestCache((code: string) => publicPlaylistCached(code));

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

// --- Debugging ---------------------------------------------------------------

/**
 * Development only: the User Service's responses as sent, for the account page's
 * debug panel. The library snapshot, then each owned playlist's snapshot.
 */
export async function getPlaylistDebugData(): Promise<{
  library: unknown;
  playlists: { id: string; snapshot: unknown }[];
} | null> {
  if (!sessionCookie.get()) return null;
  const library = await userServiceJson<LibrarySnapshotWire>('/v1/library/snapshot');
  const playlists = await Promise.all(
    (library.playlists ?? []).map(async (p) => ({
      id: p.playlist_id,
      snapshot: await userServiceJson<unknown>(
        `/v1/playlists/${encodeURIComponent(p.playlist_id)}/snapshot`
      ).catch((err: unknown) => ({ error: String(err) })),
    }))
  );
  return { library, playlists };
}
