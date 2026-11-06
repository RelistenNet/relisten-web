import { loadSong } from './load';
import { findArtistBySlug } from '@/data/artists';
import { lengthColumn, playColumn } from './columns';
import DataTable from '@/ui/table/DataTable';
import { showColumns, showFilters, showSearchText, showSorts } from '@/ui/shows/columns';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader, { type StatItem } from '@/ui/base/PageHeader';
import YearChart from '@/ui/base/YearChart';
import { tableHref, tableSearchParams, toTableState, type TableParams } from '@/ui/table/params';
import { formatShare, formatShowDate, showStats, timeAgo } from '@/ui/shows/stats';
import { durationToHHMMSS, numberFormat } from '@/lib/utils';
import { queryTable, type TableSpec } from '@/ui/table/query';
import type { ShowRow } from '@/ui/shows/rows';
import { Link } from '@timber-js/app/client';
import { redirect } from '@timber-js/app/server';
import { songUrl } from '@/lib/urls';

// Every show an artist played a song at. Songs are artist-specific in v4.

const FILTER_IDS = ['year', 'sbd'] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const songSpec: TableSpec<ShowRow> = {
  sorts: showSorts,
  defaultSort: { id: 'date', dir: 'desc' },
  searchText: showSearchText,
  filters: [showFilters.year, showFilters.sbd],
  pageSize: 25,
};

export default async function SongDetail({
  artistSlug,
  songSlug,
}: {
  artistSlug: string;
  songSlug: string;
}) {
  const [song, artist, params] = await Promise.all([
    loadSong(artistSlug, songSlug),
    findArtistBySlug(artistSlug),
    searchParams.get(),
  ]);

  // A merged song, or a setlist-only song linked to its canonical song: the API
  // returns the song under its current slug, so send the URL there.
  if (song.slug && song.slug !== songSlug) {
    redirect(songUrl(artistSlug, song.slug), { permanent: true });
  }

  const result = queryTable(song.rows, songSpec, toTableState(params, FILTER_IDS));
  const stats = showStats(song.rows);
  const pathname = songUrl(artistSlug, songSlug);
  const artistShows = artist?.showCount ?? 0;
  const subtitle = [
    song.originalArtist && `Originally by ${song.originalArtist}`,
    song.aliases.length > 0 && `Also listed as ${song.aliases.join(', ')}`,
  ].filter(Boolean);

  const statItems: StatItem[] = [
    {
      label: 'Times played',
      value: numberFormat.format(song.performances),
      detail:
        song.performances !== stats.shows
          ? `at ${numberFormat.format(stats.shows)} shows`
          : artistShows > 0
            ? `${formatShare(stats.shows, artistShows)} of shows`
            : undefined,
    },
  ];
  if (stats.first && stats.last) {
    statItems.push(
      {
        label: 'First played',
        value: <DateLink row={stats.first} />,
        detail: stats.first.venueName,
      },
      {
        label: 'Last played',
        value: <DateLink row={stats.last} />,
        detail: timeAgo(stats.last.date),
      }
    );
  }
  if (stats.medianLength) {
    statItems.push({
      label: 'Typical length',
      value: durationToHHMMSS(Math.round(stats.medianLength)),
    });
  }
  if (stats.longest?.songDuration) {
    statItems.push({
      label: 'Longest',
      value: durationToHHMMSS(Math.round(stats.longest.songDuration)),
      detail: <DateLink row={stats.longest} />,
    });
  }

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={artist && <ArtistCover artist={artist} />}
        title={song.name}
        meta={[
          ...subtitle,
          song.imported && 'Known from setlists only: no recordings are matched to this song yet',
        ]}
        stats={statItems}
      >
        <YearChart
          counts={stats.byYear}
          noun="performance"
          selectedYear={(params as TableParams).year as string | undefined}
          hrefFor={(year) => tableHref(pathname, params, { year })}
        />
      </PageHeader>

      <DataTable
        pathname={pathname}
        params={params}
        spec={songSpec}
        result={result}
        columns={[
          ...(song.imported ? [] : [playColumn]),
          showColumns.show,
          ...(song.imported ? [] : [lengthColumn]),
          showColumns.tapes,
          showColumns.plays,
        ]}
        rowKey={(r) => r.id}
        noun="performance"
        searchPlaceholder="Search venues, cities, dates"
      />
    </div>
  );
}

function DateLink({ row }: { row: ShowRow }) {
  return (
    <Link href={row.href} className="hover:text-accent">
      {formatShowDate(row.date)}
    </Link>
  );
}

export async function songDetailMetadata({
  artistSlug,
  songSlug,
}: {
  artistSlug: string;
  songSlug: string;
}) {
  const [song, artist] = await Promise.all([
    loadSong(artistSlug, songSlug).catch(() => null),
    findArtistBySlug(artistSlug),
  ]);
  return song ? { title: [song.name, artist?.name].filter(Boolean).join(' | ') } : {};
}
