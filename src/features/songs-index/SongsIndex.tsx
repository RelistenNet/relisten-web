import { href } from '@timber-js/app/routes';
import { findArtistBySlug, songs } from '@/data/artists';
import DataTable from '@/ui/table/DataTable';
import type { Column } from '@/ui/table/types';
import { tableSearchParams, toTableState } from '@/ui/table/params';
import { queryTable, type TableSpec } from '@/ui/table/query';
import { numberFormat } from '@/lib/utils';
import type { SongListItem } from '@/domain/types';
import { Link } from '@timber-js/app/client';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader from '@/ui/base/PageHeader';
import { deny } from '@timber-js/app/server';
import { artistIdForSlug } from '@/data/artists';

// Every song an artist has played, from the cached song list.

const FILTER_IDS = [] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const spec: TableSpec<SongListItem> = {
  sorts: { name: (s) => s.name, shows: (s) => s.showCount },
  defaultSort: { id: 'shows', dir: 'desc' },
  searchText: (s) => s.name ?? '',
  filters: [],
  pageSize: 25,
};

export default async function SongsIndex({ artistSlug }: { artistSlug: string }) {
  const [artist, songs, params] = await Promise.all([
    findArtistBySlug(artistSlug),
    songsForArtist(artistSlug),
    searchParams.get(),
  ]);
  if (!artist) deny(404);

  const result = queryTable(songs, spec, toTableState(params, FILTER_IDS));
  const songHref = (s: SongListItem) =>
    href('/artists/[artistSlug]/songs/[songSlug]', { artistSlug, songSlug: s.slug });
  const columns: Column<SongListItem>[] = [
    {
      id: 'name',
      label: 'Song',
      sortable: true,
      cell: (s) => (
        <Link href={songHref(s)} className="font-medium hover:underline">
          {s.name}
        </Link>
      ),
    },
    {
      id: 'shows',
      label: 'Shows',
      sortable: true,
      firstDir: 'desc',
      align: 'right',
      width: 'w-20 sm:w-64',
      bar: { value: (s) => s.showCount, max: Math.max(0, ...songs.map((s) => s.showCount)) },
      cell: (s) => numberFormat.format(s.showCount),
    },
  ];

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={<ArtistCover artist={artist} />}
        title="Songs"
        stats={[{ label: 'Songs', value: numberFormat.format(songs.length) }]}
      />
      <DataTable
        pathname={href('/artists/[artistSlug]/songs', { artistSlug })}
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(s) => s.id}
        rowHref={songHref}
        minWidth="min-w-0"
        noun="song"
        searchPlaceholder="Search songs"
      />
    </div>
  );
}

export async function songsIndexMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Songs | ${artist.name}` } : {};
}

const songsForArtist = async (artistSlug: string) =>
  songs.orDeny(await artistIdForSlug(artistSlug));
