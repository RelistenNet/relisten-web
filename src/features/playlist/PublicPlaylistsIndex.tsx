import { Link } from '@timber-js/app/client';
import { ListMusicIcon } from 'lucide-react';
import { href } from '@timber-js/app/routes';
import { deny } from '@timber-js/app/server';
import { findArtistBySlug } from '@/data/artists';
import { getPublicPlaylists, type PublicPlaylistRow } from '@/data/playlists';
import { sessionCookie } from '@/lib/session/sessionCookie';
import { numberFormat } from '@/lib/utils';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader, { type StatItem } from '@/ui/base/PageHeader';
import DataTable from '@/ui/table/DataTable';
import { tableSearchParams, toTableState } from '@/ui/table/params';
import { queryTable, type TableSpec } from '@/ui/table/query';
import type { Column } from '@/ui/table/types';
import { readableDuration } from './PlaylistArticle';

// Published playlists as a table: every one (/playlists), or those with at
// least one of an artist's tracks (/artists/phish/playlists), each from its
// cached list.

const FILTER_IDS = [] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const spec: TableSpec<PublicPlaylistRow> = {
  sorts: {
    name: (p) => p.name.toLowerCase(),
    creator: (p) => p.creator.toLowerCase(),
    tracks: (p) => p.trackCount,
    duration: (p) => p.duration,
    plays: (p) => p.recentPlayCount,
    followers: (p) => p.followerCount,
    updated: (p) => p.updatedAt,
  },
  defaultSort: { id: 'updated', dir: 'desc' },
  searchText: (p) => `${p.name} ${p.creator}`,
  filters: [],
  pageSize: 25,
};

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const playlistHref = (p: PublicPlaylistRow) =>
  href('/playlists/[publicCode]', { publicCode: p.publicCode });

export default async function PublicPlaylistsIndex({ artistSlug }: { artistSlug?: string }) {
  const [artist, params] = await Promise.all([
    artistSlug ? findArtistBySlug(artistSlug) : undefined,
    searchParams.get(),
  ]);
  if (artistSlug && !artist) deny(404);
  const list = await getPublicPlaylists(artist?.id);

  const result = queryTable(list, spec, toTableState(params, FILTER_IDS));
  const columns: Column<PublicPlaylistRow>[] = [
    {
      id: 'name',
      label: 'Playlist',
      sortable: true,
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
      sortable: true,
      width: 'w-36',
      hideBelow: 'sm',
      cell: (p) => <span className="truncate text-text-secondary">{p.creator}</span>,
    },
    {
      id: 'tracks',
      label: 'Tracks',
      sortable: true,
      firstDir: 'desc',
      align: 'right',
      width: 'w-20',
      cell: (p) => numberFormat.format(p.trackCount),
    },
    {
      id: 'duration',
      label: 'Length',
      sortable: true,
      firstDir: 'desc',
      align: 'right',
      width: 'w-28',
      hideBelow: 'md',
      cell: (p) => (p.duration > 0 ? readableDuration(p.duration) : '—'),
    },
    {
      id: 'plays',
      label: 'Plays (30d)',
      sortable: true,
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
      firstDir: 'desc',
      align: 'right',
      width: 'w-32',
      hideBelow: 'sm',
      cell: (p) => dateFormat.format(new Date(p.updatedAt)),
    },
  ];

  const stats: StatItem[] = [
    { label: 'Playlists', value: numberFormat.format(list.length) },
    {
      label: 'Tracks',
      value: numberFormat.format(list.reduce((n, p) => n + p.trackCount, 0)),
    },
  ];

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={artist && <ArtistCover artist={artist} />}
        title="Playlists"
        meta={[artist ? `With ${artist.name}` : 'Shared by listeners']}
        stats={stats}
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
      <DataTable
        pathname={
          artistSlug ? href('/artists/[artistSlug]/playlists', { artistSlug }) : href('/playlists')
        }
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(p) => p.playlistId}
        rowHref={playlistHref}
        minWidth="min-w-0"
        noun="playlist"
        searchPlaceholder="Search playlists, creators"
      />
    </div>
  );
}

export async function publicPlaylistsIndexMetadata({ artistSlug }: { artistSlug?: string }) {
  if (!artistSlug) return { title: 'Playlists' };
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Playlists | ${artist.name}` } : {};
}
