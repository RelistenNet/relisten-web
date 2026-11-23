import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { deny, redirect } from '@timber-js/app/server';
import { ArchiveIcon, BanIcon, GlobeIcon, LockIcon, type LucideIcon } from 'lucide-react';
import { findArtistBySlug } from '@/data/artists';
import {
  getPlaylistLibrary,
  getPublicPlaylistPage,
  ownPlaylistRows,
  type OwnPlaylistStatus,
  type PlaylistListRow,
  type PublicPlaylistSort,
} from '@/data/playlists';
import {
  myPlaylistsHref,
  publicPlaylistsSearchParams,
} from '@/lib/searchParams/publicPlaylistsSearchParams';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import { sessionCookie } from '@/lib/session/sessionCookie';
import { numberFormat } from '@/lib/utils';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader from '@/ui/base/PageHeader';
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
// field: the library has no creator (it's them), length, plays or followers.

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
  defaultSort: { id: 'updated', dir: 'desc' },
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

const columns: Column<PlaylistListRow>[] = [
  {
    id: 'name',
    label: 'Playlist',
    cell: (p) => (
      <span className="flex min-w-0 flex-col">
        <Link href={playlistHref(p)} className="truncate font-medium hover:underline">
          {p.name}
        </Link>
        {/* The creator's column is hidden on phones: say it here instead. */}
        {p.creator && (
          <span className="truncate text-xs text-text-muted sm:hidden">By {p.creator}</span>
        )}
      </span>
    ),
  },
  {
    id: 'creator',
    label: 'Creator',
    width: 'w-36',
    hideBelow: 'sm',
    cell: (p) => <span className="truncate text-text-secondary">{p.creator}</span>,
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
  'name',
  'creator',
  'tracks',
  'duration',
  'plays',
  'followers',
  'updated',
];
const OWN_COLUMNS = ['name', 'status', 'tracks', 'updated'];

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
    const library = await getPlaylistLibrary();
    if (!library) redirect(signInHref(myPlaylistsHref()));
    view = {
      rows: ownPlaylistRows(library.owned),
      sort: 'updated',
      columns: OWN_COLUMNS,
      nextCursor: null,
    };
  } else {
    const sortId = params.sort?.replace(/^-/, '') ?? '';
    const sort = Object.hasOwn(API_SORTS, sortId) ? sortId : spec.defaultSort.id;
    const page = await getPublicPlaylistPage(API_SORTS[sort], artist?.id, params.cursor);
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
        cover={artist && <ArtistCover artist={artist} />}
        title="Playlists"
        meta={[artist ? `With ${artist.name}` : mine ? 'Your Playlists' : 'Shared by listeners']}
        aside={
          !artistSlug && signedIn ? <PlaylistScopeTabs scope={mine ? 'mine' : 'all'} /> : undefined
        }
      />
      <div className="flex flex-col gap-4">
        <DataTable
          pathname={pathname}
          // Only the sort (and whose): a header link starts its order from the first page.
          params={mine ? { scope: 'mine' } : { sort: params.sort }}
          spec={mine ? { ...spec, sorts: { updated: spec.sorts.updated } } : spec}
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
