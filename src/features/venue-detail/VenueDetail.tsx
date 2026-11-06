import { loadScopedVenue } from './load';
import DataTable from '@/ui/table/DataTable';
import { showColumns, showFilters, showSearchText, showSorts } from '@/ui/show-table/showColumns';
import StatGrid, { type StatItem } from '@/ui/detail/StatGrid';
import YearChart from '@/ui/detail/YearChart';
import { tableHref, tableSearchParams, toTableState, type TableParams } from '@/ui/table/params';
import { queryTable, type TableSpec } from '@/ui/table/query';
import type { ShowRow } from '@/ui/show-table/showRows';
import { formatShowDate, showStats, timeAgo } from '@/ui/show-table/showStats';
import { numberFormat } from '@/lib/utils';
import { Link } from '@timber-js/app/client';
import ArtistScopeSelect from './ArtistScopeSelect';
import { artistUrl, artistVenuesUrl, venueUrl } from '@/lib/urls';

// A venue's shows: across every artist (/venues/msg), or one artist's
// (/artists/phish/venues/msg). Both come from the same cached venue fetch; the artist
// scope just narrows the rows, so stats, chart, and table all follow it.

const FILTER_IDS = ['year', 'sbd'] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const venueSpec: TableSpec<ShowRow> = {
  sorts: showSorts,
  defaultSort: { id: 'date', dir: 'desc' },
  searchText: showSearchText,
  filters: [showFilters.year, showFilters.sbd],
  pageSize: 25,
};

export default async function VenueDetail({
  venueSlug,
  artistSlug,
}: {
  venueSlug: string;
  artistSlug?: string;
}) {
  const [{ venue, rows, artistName }, params] = await Promise.all([
    loadScopedVenue(venueSlug, artistSlug),
    searchParams.get(),
  ]);

  const pathname = venueUrl(venueSlug, artistSlug);
  const result = queryTable(rows, venueSpec, toTableState(params, FILTER_IDS));
  const stats = showStats(rows);

  // Artists who played here, busiest first: the scope picker and "Artists" stat.
  const perArtist = new Map<string, { slug: string; name: string; count: number }>();
  for (const r of venue.rows) {
    const a = perArtist.get(r.artistSlug) ?? { slug: r.artistSlug, name: r.artistName, count: 0 };
    a.count++;
    perArtist.set(r.artistSlug, a);
  }
  const artists = [...perArtist.values()].sort((a, b) => b.count - a.count);

  const statItems: StatItem[] = [{ label: 'Shows', value: numberFormat.format(rows.length) }];
  if (!artistSlug) {
    statItems.push({
      label: 'Artists',
      value: numberFormat.format(artists.length),
      detail: artists.length > 1 ? `most: ${artists[0].name} (${artists[0].count})` : undefined,
    });
  }
  if (stats.first && stats.last) {
    statItems.push(
      {
        label: 'First show',
        value: <DateLink row={stats.first} />,
        detail: !artistSlug && artists.length > 1 ? stats.first.artistName : undefined,
      },
      {
        label: 'Most recent',
        value: <DateLink row={stats.last} />,
        detail: timeAgo(stats.last.date),
      }
    );
  }

  return (
    <div className="detail-page flex flex-col gap-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <nav aria-label="Breadcrumb" className="text-base text-text-muted sm:text-sm">
            {artistSlug ? (
              <>
                <Link href={artistUrl(artistSlug)} className="hover:text-text-primary">
                  {artistName}
                </Link>
                <span aria-hidden> › </span>
                <Link href={artistVenuesUrl(artistSlug)} className="hover:text-text-primary">
                  Venues
                </Link>
              </>
            ) : (
              'Venue'
            )}
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-text-primary">
            {artistSlug ? `${artistName} at ${venue.name}` : venue.name}
          </h1>
          {(venue.location || venue.otherNames.length > 0) && (
            <p className="text-base text-pretty text-text-muted sm:text-sm">
              {[
                venue.location,
                venue.otherNames.length > 0 && `Also known as ${venue.otherNames.join(', ')}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        {artists.length > 1 && (
          <ArtistScopeSelect venueSlug={venueSlug} artistSlug={artistSlug} artists={artists} />
        )}

        <StatGrid items={statItems} />

        <YearChart
          counts={stats.byYear}
          noun="show"
          selectedYear={(params as TableParams).year as string | undefined}
          hrefFor={(year) => tableHref(pathname, params, { year })}
        />
      </header>

      <DataTable
        pathname={pathname}
        params={params}
        spec={venueSpec}
        result={result}
        columns={[
          showColumns.date,
          ...(artistSlug ? [] : [showColumns.artist]),
          showColumns.tapes,
          showColumns.rating,
          showColumns.plays,
        ]}
        rowKey={(r) => r.id}
        noun="show"
        searchPlaceholder={artistSlug ? 'Search dates' : 'Search artists, dates'}
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

export async function venueMetadata(venueSlug: string, artistSlug?: string) {
  const loaded = await loadScopedVenue(venueSlug, artistSlug).catch(() => null);
  if (!loaded) return {};
  const { venue, artistName } = loaded;
  const place = [venue.name, venue.location].filter(Boolean).join(', ');
  return { title: artistSlug ? `${artistName} at ${place}` : place };
}
