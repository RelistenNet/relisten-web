import { loadTours } from './load';
import { findArtistBySlug } from '@/data/artists';
import DataTable from '@/ui/table/DataTable';
import type { Column } from '@/ui/table/types';
import { tableSearchParams, toTableState } from '@/ui/table/params';
import { queryTable, type TableSpec } from '@/ui/table/query';
import { formatShowDate } from '@/ui/shows/stats';
import { artistToursUrl, artistUrl, tourUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
import type { TourSummary } from '@/domain/types';
import { Link } from '@timber-js/app/client';
import { deny } from '@timber-js/app/server';

// Every tour an artist has played, from the cached tour list.

const FILTER_IDS = [] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const spec: TableSpec<TourSummary> = {
  sorts: {
    name: (t) => t.name,
    start: (t) => t.startDate,
    shows: (t) => t.showCount,
  },
  defaultSort: { id: 'start', dir: 'desc' },
  searchText: (t) => t.name ?? '',
  filters: [],
  pageSize: 25,
};

const day = (iso?: string) => (iso ? formatShowDate(iso.slice(0, 10)) : '—');

export default async function Tours({ artistSlug }: { artistSlug: string }) {
  const [artist, tours, params] = await Promise.all([
    findArtistBySlug(artistSlug),
    loadTours(artistSlug),
    searchParams.get(),
  ]);
  if (!artist) deny(404);

  const result = queryTable(tours, spec, toTableState(params, FILTER_IDS));
  const columns: Column<TourSummary>[] = [
    {
      id: 'name',
      label: 'Tour',
      sortable: true,
      cell: (t) => (
        <Link href={tourUrl(artistSlug, t.slug)} className="text-accent hover:underline">
          {t.name}
        </Link>
      ),
    },
    {
      id: 'start',
      label: 'Dates',
      sortable: true,
      firstDir: 'desc',
      width: 'w-64',
      hideBelow: 'sm',
      cell: (t) => `${day(t.startDate)} – ${day(t.endDate)}`,
    },
    {
      id: 'shows',
      label: 'Shows',
      sortable: true,
      firstDir: 'desc',
      align: 'right',
      width: 'w-24',
      cell: (t) => numberFormat.format(t.showCount),
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
          Tours
        </h1>
      </header>
      <DataTable
        pathname={artistToursUrl(artistSlug)}
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(t) => t.id}
        noun="tour"
        searchPlaceholder="Search tours"
      />
    </div>
  );
}

export async function toursMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Tours | ${artist.name}` } : {};
}
