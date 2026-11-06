import DataTable from '@/components/table/DataTable';
import type { Column } from '@/components/table/types';
import RelistenAPI from '@/lib/RelistenAPI';
import { tableSearchParams, toTableState } from '@/lib/table/params';
import { queryTable, type TableSpec } from '@/lib/table/query';
import { artistSongsUrl, artistUrl, songUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
import type { Song } from '@/types';
import { Link } from '@timber-js/app/client';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// Every song an artist has played, from the cached song list.

const FILTER_IDS = ['recorded'] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const spec: TableSpec<Song> = {
  sorts: { name: (s) => s.name, shows: (s) => s.shows_played_at },
  defaultSort: { id: 'shows', dir: 'desc' },
  searchText: (s) => s.name ?? '',
  filters: [
    {
      kind: 'toggle',
      id: 'recorded',
      label: 'With recordings',
      // Imported songs are known from setlists only: nothing to play.
      test: (s) => !s.id.startsWith('imported_song_'),
    },
  ],
  pageSize: 25,
};

export default async function ArtistSongsPage() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  const [artist, songs, params] = await Promise.all([
    RelistenAPI.findArtist(artistSlug),
    RelistenAPI.fetchSongs(artistSlug),
    searchParams.get(),
  ]);
  if (!artist) deny(404);

  const rows = songs.filter((s) => s.slug);
  const result = queryTable(rows, spec, toTableState(params, FILTER_IDS));
  const columns: Column<Song>[] = [
    {
      id: 'name',
      label: 'Song',
      sortable: true,
      cell: (s) => (
        <Link href={songUrl(artistSlug, s.slug ?? '')} className="text-accent hover:underline">
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
      width: 'w-24',
      cell: (s) => numberFormat.format(s.shows_played_at ?? 0),
    },
  ];

  return (
    <div className="detail-page flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <nav aria-label="Breadcrumb" className="text-base text-text-muted sm:text-sm">
          <Link href={artistUrl(artistSlug)} className="hover:text-text-primary">
            {artist.name}
          </Link>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-text-primary">
          Songs
        </h1>
      </header>
      <DataTable
        pathname={artistSongsUrl(artistSlug)}
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(s) => s.id}
        noun="song"
        searchPlaceholder="Search songs"
      />
    </div>
  );
}

export const metadata = async () => {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  const artist = await RelistenAPI.findArtist(artistSlug);
  return artist ? { title: `Songs | ${artist.name}` } : {};
};
