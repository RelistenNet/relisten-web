import { Link } from '@timber-js/app/client';
import { ListMusicIcon } from 'lucide-react';
import { href } from '@timber-js/app/routes';
import { deny } from '@timber-js/app/server';
import { findArtistBySlug } from '@/data/artists';
import {
  getPublicPlaylistPage,
  type PublicPlaylistRow,
  type PublicPlaylistSort,
} from '@/data/playlists';
import { publicPlaylistsSearchParams } from '@/lib/searchParams/publicPlaylistsSearchParams';
import { sessionCookie } from '@/lib/session/sessionCookie';
import { numberFormat } from '@/lib/utils';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader from '@/ui/base/PageHeader';
import DataTable from '@/ui/table/DataTable';
import type { TableResult, TableSpec } from '@/ui/table/query';
import type { Column } from '@/ui/table/types';
import { readableDuration } from './PlaylistArticle';

// Published playlists as a table: every one (/playlists), or those with at
// least one of an artist's tracks (/artists/phish/playlists). The User Service
// sorts and pages them: one request per page, and the table shows that page as
// it came. A page links to the next by the service's cursor.

/** The table's sortable columns, by the User Service sort each one is. */
const API_SORTS: Record<string, PublicPlaylistSort> = {
  updated: 'recent',
  plays: 'plays',
  followers: 'followers',
};

// The DataTable reads which columns sort from the spec's keys; the rows arrive
// sorted, so its accessors are never called.
const spec: TableSpec<PublicPlaylistRow> = {
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

const playlistHref = (p: PublicPlaylistRow) =>
  href('/playlists/[publicCode]', { publicCode: p.publicCode });

const columns: Column<PublicPlaylistRow>[] = [
  {
    id: 'name',
    label: 'Playlist',
    cell: (p) => (
      <span className="flex min-w-0 flex-col">
        <Link href={playlistHref(p)} className="truncate font-medium hover:underline">
          {p.name}
        </Link>
        {/* The creator's column is hidden on phones: say it here instead. */}
        <span className="truncate text-xs text-text-muted sm:hidden">By {p.creator}</span>
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
    cell: (p) => (p.duration > 0 ? readableDuration(p.duration) : '—'),
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
    cell: (p) => numberFormat.format(p.recentPlayCount),
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
    cell: (p) => numberFormat.format(p.followerCount),
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

export default async function PublicPlaylistsIndex({ artistSlug }: { artistSlug?: string }) {
  const [artist, params] = await Promise.all([
    artistSlug ? findArtistBySlug(artistSlug) : undefined,
    publicPlaylistsSearchParams.get(),
  ]);
  if (artistSlug && !artist) deny(404);

  const sortId = params.sort?.replace(/^-/, '') ?? '';
  const sort = Object.hasOwn(API_SORTS, sortId) ? sortId : spec.defaultSort.id;
  const page = await getPublicPlaylistPage(API_SORTS[sort], artist?.id, params.cursor);
  // A cursor the User Service refused (from another sort, or made up).
  if (!page) deny(404);

  const pathname = artistSlug
    ? href('/artists/[artistSlug]/playlists', { artistSlug })
    : href('/playlists');
  const pageHref = (cursor?: string) =>
    publicPlaylistsSearchParams.href(pathname, { sort: params.sort, cursor });
  const result: TableResult<PublicPlaylistRow> = {
    rows: page.rows,
    total: page.rows.length,
    totalAll: page.rows.length,
    page: 1,
    pageCount: 1,
    start: 1,
    sort: { id: sort, dir: 'desc' },
    facets: {},
  };

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={artist && <ArtistCover artist={artist} />}
        title="Playlists"
        meta={[artist ? `With ${artist.name}` : 'Shared by listeners']}
        actions={
          // The listener's own (published or not) are on the account page.
          !artistSlug && sessionCookie.get() !== null ? (
            <Link href={href('/account')} className="header-action">
              <ListMusicIcon className="size-4" aria-hidden />
              Your Playlists
            </Link>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-4">
        <DataTable
          pathname={pathname}
          // Only the sort: a header link starts the new order from its first page.
          params={{ sort: params.sort }}
          spec={spec}
          result={result}
          columns={columns}
          rowKey={(p) => p.playlistId}
          rowHref={playlistHref}
          minWidth="min-w-0"
          noun="playlist"
          controls={false}
        />
        {(params.cursor || page.nextCursor) && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            {params.cursor ? (
              <Link href={pageHref()} className="header-action">
                First Page
              </Link>
            ) : (
              <span />
            )}
            {page.nextCursor && (
              <Link href={pageHref(page.nextCursor)} className="header-action">
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
