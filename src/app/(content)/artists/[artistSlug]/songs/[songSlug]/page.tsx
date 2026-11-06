import DataTable from '@/components/table/DataTable';
import {
  showColumns,
  showFilters,
  showSearchText,
  showSorts,
} from '@/components/table/showColumns';
import RelistenAPI from '@/lib/RelistenAPI';
import StatGrid, { type StatItem } from '@/components/detail/StatGrid';
import YearChart from '@/components/detail/YearChart';
import { tableHref, tableSearchParams, toTableState, type TableParams } from '@/lib/table/params';
import { formatShare, formatShowDate, showStats, timeAgo } from '@/lib/table/showStats';
import { durationToHHMMSS, numberFormat } from '@/lib/utils';
import { queryTable, type TableSpec } from '@/lib/table/query';
import type { ShowRow } from '@/lib/table/showRows';
import { Link } from '@timber-js/app/client';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';
import { artistSongsUrl, artistUrl, songUrl } from '@/lib/urls';

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

export default async function SongPage() {
  const { artistSlug, songSlug } = getSegmentParams(SEGMENT_PATH);

  const [song, artist, params] = await Promise.all([
    RelistenAPI.fetchSongDetail(artistSlug, songSlug),
    RelistenAPI.findArtist(artistSlug),
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
  const artistShows = artist?.show_count ?? 0;
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
    <div className="detail-page flex flex-col gap-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <nav aria-label="Breadcrumb" className="text-base text-text-muted sm:text-sm">
            <Link href={artistUrl(artistSlug)} className="hover:text-text-primary">
              {artist?.name ?? artistSlug}
            </Link>
            <span aria-hidden> › </span>
            <Link href={artistSongsUrl(artistSlug)} className="hover:text-text-primary">
              Songs
            </Link>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-text-primary">
            {song.name}
          </h1>
          {subtitle.length > 0 && (
            <p className="text-base text-pretty text-text-muted sm:text-sm">
              {subtitle.join(' · ')}
            </p>
          )}
          {song.imported && (
            <p className="text-base text-pretty text-text-muted sm:text-sm">
              Known from setlists only: no recordings are matched to this song yet.
            </p>
          )}
        </div>

        <StatGrid items={statItems} />

        <YearChart
          counts={stats.byYear}
          noun="performance"
          selectedYear={(params as TableParams).year as string | undefined}
          hrefFor={(year) => tableHref(pathname, params, { year })}
        />
      </header>

      <DataTable
        pathname={pathname}
        params={params}
        spec={songSpec}
        result={result}
        columns={[
          ...(song.imported ? [] : [showColumns.play]),
          showColumns.show,
          ...(song.imported ? [] : [showColumns.length]),
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

export const metadata = async () => {
  const { artistSlug, songSlug } = getSegmentParams(SEGMENT_PATH);
  const [song, artist] = await Promise.all([
    RelistenAPI.fetchSongDetail(artistSlug, songSlug).catch(() => null),
    RelistenAPI.findArtist(artistSlug),
  ]);
  return song ? { title: [song.name, artist?.name].filter(Boolean).join(' | ') } : {};
};
