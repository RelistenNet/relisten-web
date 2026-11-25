import { Fragment } from 'react';
import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import {
  ArchiveIcon,
  BanIcon,
  GlobeIcon,
  ListMusicIcon,
  LockIcon,
  type LucideIcon,
  PlusIcon,
} from 'lucide-react';
import { findArtistBySlug } from '@/data/artists';
import {
  denyIfUnavailable,
  getPlaylistLibrary,
  getPublicPlaylistPage,
  ownPlaylistRows,
  type OwnPlaylistStatus,
  type PlaylistListArtist,
  type PlaylistListRow,
  type PublicPlaylistSort,
} from '@/data/playlists';
import {
  myPlaylistsHref,
  publicPlaylistsSearchParams,
} from '@/lib/searchParams/publicPlaylistsSearchParams';
import { signInPageHref } from '@/lib/searchParams/sessionSearchParams';
import { sessionCookie } from '@/lib/session/sessionCookie';
import { numberFormat } from '@/lib/utils';
import { PlayPlaylistButton } from '@/player/QueueButtons';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader from '@/ui/base/PageHeader';
import { ALL_ARTISTS_CRUMB, artistCrumb } from '@/ui/base/crumbs';
import DataTable from '@/ui/table/DataTable';
import type { TableResult, TableSpec } from '@/ui/table/query';
import type { Column } from '@/ui/table/types';
import { readableDuration } from './PlaylistArticle';
import PlaylistScopeTabs from './PlaylistScopeTabs';

// The playlists listing, one table for every view: every published playlist
// (/playlists), those with an artist's tracks (/artists/phish/playlists), or
// the signed-in listener's own (?scope=mine). Published ones come a page at a
// time from the User Service, sorted and paged there; the listener's own come
// from their library, whole. A column shows only where its source has the
// field: the library has no creator (it’s them), artists, length, plays or
// followers.

/** The sortable columns, by the User Service sort each one is. */
const API_SORTS: Record<string, PublicPlaylistSort> = {
  updated: 'recent',
  plays: 'plays',
  followers: 'followers',
};

// The DataTable reads which columns sort from the spec's keys; the rows arrive
// sorted, so its accessors are never called.
const spec: TableSpec<PlaylistListRow> = {
  sorts: {
    updated: (p) => p.updatedAt,
    plays: (p) => p.recentPlayCount,
    followers: (p) => p.followerCount,
  },
  defaultSort: { id: 'plays', dir: 'desc' },
  searchText: () => '',
  filters: [],
  pageSize: 50,
};

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const STATUS: Record<OwnPlaylistStatus, { label: string; icon: LucideIcon }> = {
  'published': { label: 'Published', icon: GlobeIcon },
  'private': { label: 'Private', icon: LockIcon },
  'archived': { label: 'Archived', icon: ArchiveIcon },
  'taken-down': { label: 'Taken Down', icon: BanIcon },
};

const playlistHref = (p: PlaylistListRow) =>
  href('/playlists/[playlist]', { playlist: p.playlist });
const count = (n: number | undefined) => (n === undefined ? '—' : numberFormat.format(n));

/** How many artists a row names before "+N". */
const SHOWN_ARTISTS = 2;

/**
 * The first artists, then how many more (all named on hover). `linked`: each
 * name links to the artist's playlists; not on phones, where the row's own
 * link is the tap target.
 */
function ArtistList({ artists, linked }: { artists: PlaylistListArtist[]; linked?: boolean }) {
  const rest = artists.length - SHOWN_ARTISTS;
  return (
    <span title={artists.map((a) => a.name).join(', ')}>
      {artists.slice(0, SHOWN_ARTISTS).map((a, i) => (
        <Fragment key={a.slug}>
          {i > 0 && ', '}
          {linked ? (
            <Link
              href={href('/artists/[artistSlug]/playlists', { artistSlug: a.slug })}
              className="hover:underline"
            >
              {a.name}
            </Link>
          ) : (
            a.name
          )}
        </Fragment>
      ))}
      {rest > 0 && <span className="text-text-muted"> +{rest}</span>}
    </span>
  );
}

const columns: Column<PlaylistListRow>[] = [
  // Play the whole playlist from the top, as a show table's rows play their show.
  {
    id: 'play',
    width: 'w-14',
    label: 'Play',
    srOnlyLabel: true,
    cell: (p) => (
      <PlayPlaylistButton playlist={p.playlist} playlistId={p.playlistId} name={p.name} />
    ),
  },
  {
    id: 'name',
    label: 'Playlist',
    cell: (p) => {
      // Who made it and what it's about share one line, so the artists get a column.
      const byline = [p.creator && `By ${p.creator}`, p.summary].filter(Boolean).join(' · ');
      return (
        <span className="flex min-w-0 flex-col">
          <Link href={playlistHref(p)} className="truncate font-medium hover:underline">
            {p.name}
          </Link>
          {byline && <span className="truncate text-sm text-text-muted">{byline}</span>}
          {/* The artists' column is hidden on phones: name them here instead. */}
          {!!p.artists?.length && (
            <span className="truncate text-xs text-text-muted sm:hidden">
              <ArtistList artists={p.artists} />
            </span>
          )}
        </span>
      );
    },
  },
  {
    id: 'artists',
    label: 'Artists',
    width: 'w-44',
    hideBelow: 'sm',
    cell: (p) =>
      p.artists?.length ? (
        <span className="text-text-secondary">
          <ArtistList artists={p.artists} linked />
        </span>
      ) : (
        '—'
      ),
  },
  {
    id: 'status',
    label: 'Status',
    width: 'w-32',
    cell: (p) => {
      if (!p.status) return null;
      const { label, icon: Icon } = STATUS[p.status];
      return (
        <span className="inline-flex items-center gap-1.5 text-text-muted">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {label}
        </span>
      );
    },
  },
  {
    id: 'tracks',
    label: 'Tracks',
    align: 'right',
    width: 'w-20',
    cell: (p) => numberFormat.format(p.trackCount),
  },
  {
    id: 'duration',
    label: 'Length',
    align: 'right',
    width: 'w-28',
    hideBelow: 'md',
    cell: (p) => (p.duration ? readableDuration(p.duration) : '—'),
  },
  {
    id: 'plays',
    label: 'Plays (30d)',
    sortable: true,
    oneWay: true,
    firstDir: 'desc',
    align: 'right',
    width: 'w-28',
    hideBelow: 'md',
    cell: (p) => count(p.recentPlayCount),
  },
  {
    id: 'followers',
    label: 'Followers',
    sortable: true,
    oneWay: true,
    firstDir: 'desc',
    align: 'right',
    width: 'w-24',
    hideBelow: 'md',
    cell: (p) => count(p.followerCount),
  },
  {
    id: 'updated',
    label: 'Updated',
    sortable: true,
    oneWay: true,
    firstDir: 'desc',
    align: 'right',
    width: 'w-32',
    hideBelow: 'sm',
    cell: (p) => dateFormat.format(new Date(p.updatedAt)),
  },
];

/** The columns each source fills. */
const PUBLISHED_COLUMNS = [
  'play',
  'name',
  'artists',
  'tracks',
  'duration',
  'plays',
  'followers',
  'updated',
];
const OWN_COLUMNS = ['play', 'name', 'status', 'tracks', 'updated'];

type View = {
  rows: PlaylistListRow[];
  /** The sorted column. */
  sort: string;
  columns: string[];
  /** The next page's cursor (published only), or null on the last page. */
  nextCursor: string | null;
};

export default async function PublicPlaylistsIndex({ artistSlug }: { artistSlug?: string }) {
  const [artist, params] = await Promise.all([
    artistSlug ? findArtistBySlug(artistSlug) : undefined,
    publicPlaylistsSearchParams.get(),
  ]);
  if (artistSlug && !artist) deny(404);
  const mine = !artistSlug && params.scope === 'mine';
  const signedIn = sessionCookie.get() !== null;

  let view: View;
  if (mine) {
    // Most recently updated first, as the library comes; it has nothing else to sort by.
    const library = await getPlaylistLibrary().catch(denyIfUnavailable);
    if (!library) redirect(signInPageHref(myPlaylistsHref()));
    view = {
      rows: ownPlaylistRows(library.owned),
      sort: 'updated',
      columns: OWN_COLUMNS,
      nextCursor: null,
    };
  } else {
    const sortId = params.sort?.replace(/^-/, '') ?? '';
    const sort = Object.hasOwn(API_SORTS, sortId) ? sortId : spec.defaultSort.id;
    const page = await getPublicPlaylistPage(API_SORTS[sort], artist?.id, params.cursor).catch(
      denyIfUnavailable
    );
    // A cursor the User Service refused (from another sort, or made up).
    if (!page) deny(404);
    view = { rows: page.rows, sort, columns: PUBLISHED_COLUMNS, nextCursor: page.nextCursor };
  }

  const pathname = artistSlug
    ? href('/artists/[artistSlug]/playlists', { artistSlug })
    : href('/playlists');
  const pageHref = (cursor?: string) =>
    publicPlaylistsSearchParams.href(pathname, { sort: params.sort, cursor });
  const result: TableResult<PlaylistListRow> = {
    rows: view.rows,
    total: view.rows.length,
    totalAll: view.rows.length,
    page: 1,
    pageCount: 1,
    start: 1,
    sort: { id: view.sort, dir: 'desc' },
    facets: {},
  };

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        crumbs={[artist ? artistCrumb(artist) : ALL_ARTISTS_CRUMB]}
        cover={artist && <ArtistCover artist={artist} />}
        title="Playlists"
        meta={[artist ? undefined : mine ? 'Your Playlists' : 'Shared by listeners']}
        aside={
          !artistSlug && signedIn ? <PlaylistScopeTabs scope={mine ? 'mine' : 'all'} /> : undefined
        }
        actions={
          <>
            {/* An artist's listing links out to every artist's. */}
            {artistSlug && (
              <Link href={href('/playlists')} className="header-action">
                <ListMusicIcon className="size-4" aria-hidden />
                All Playlists
              </Link>
            )}
            {signedIn && (
              <Link href={href('/playlists/new')} className="header-action-primary">
                <PlusIcon className="size-4" aria-hidden />
                New Playlist
              </Link>
            )}
          </>
        }
      />
      <div className="flex flex-col gap-4">
        <DataTable
          pathname={pathname}
          // Only the sort (and whose): a header link starts its order from the first page.
          params={mine ? { scope: 'mine' } : { sort: params.sort }}
          spec={
            mine
              ? {
                  ...spec,
                  sorts: { updated: spec.sorts.updated },
                  defaultSort: { id: 'updated', dir: 'desc' },
                }
              : spec
          }
          result={result}
          columns={columns.filter((c) => view.columns.includes(c.id))}
          rowKey={(p) => p.playlistId}
          rowHref={playlistHref}
          minWidth="min-w-0"
          noun="playlist"
          controls={false}
        />
        {(params.cursor || view.nextCursor) && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            {params.cursor ? (
              <Link href={pageHref()} className="header-action">
                First Page
              </Link>
            ) : (
              <span />
            )}
            {view.nextCursor && (
              <Link href={pageHref(view.nextCursor)} className="header-action">
                More Playlists
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

export async function publicPlaylistsIndexMetadata({ artistSlug }: { artistSlug?: string }) {
  if (!artistSlug) return { title: 'Playlists' };
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Playlists | ${artist.name}` } : {};
}
