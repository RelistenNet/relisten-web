import { findArtistBySlug, venues } from '@/data/artists';
import DataTable from '@/ui/table/DataTable';
import type { Column } from '@/ui/table/types';
import { tableSearchParams, toTableState } from '@/ui/table/params';
import { queryTable, type TableSpec } from '@/ui/table/query';
import { artistUrl, artistVenuesUrl, venueUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
import type { Venue } from '@/types';
import { Link } from '@timber-js/app/client';
import { deny } from '@timber-js/app/server';
import { artistIdForSlug } from '@/data/artists';

// Every venue an artist has played, from the cached venue list.

const FILTER_IDS = [] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const spec: TableSpec<Venue> = {
  sorts: {
    name: (v) => v.name,
    location: (v) => v.location,
    shows: (v) => v.shows_at_venue,
  },
  defaultSort: { id: 'shows', dir: 'desc' },
  searchText: (v) => [v.name, v.location].filter(Boolean).join(' '),
  filters: [],
  pageSize: 25,
};

export default async function VenuesIndex({ artistSlug }: { artistSlug: string }) {
  const [artist, venues, params] = await Promise.all([
    findArtistBySlug(artistSlug),
    venuesForArtist(artistSlug),
    searchParams.get(),
  ]);
  if (!artist) deny(404);

  const rows = venues.filter((v) => v.slug);
  const result = queryTable(rows, spec, toTableState(params, FILTER_IDS));
  const columns: Column<Venue>[] = [
    {
      id: 'name',
      label: 'Venue',
      sortable: true,
      cell: (v) => (
        <Link href={venueUrl(v.slug ?? '', artistSlug)} className="text-accent hover:underline">
          {v.name}
        </Link>
      ),
    },
    {
      id: 'location',
      label: 'Location',
      sortable: true,
      width: 'w-56',
      hideBelow: 'sm',
      cell: (v) => v.location ?? '—',
    },
    {
      id: 'shows',
      label: 'Shows',
      sortable: true,
      firstDir: 'desc',
      align: 'right',
      width: 'w-24',
      cell: (v) => numberFormat.format(v.shows_at_venue ?? 0),
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
          Venues
        </h1>
      </header>
      <DataTable
        pathname={artistVenuesUrl(artistSlug)}
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(v) => v.id}
        noun="venue"
        searchPlaceholder="Search venues, cities"
      />
    </div>
  );
}

export async function venuesIndexMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Venues | ${artist.name}` } : {};
}

const venuesForArtist = async (artistSlug: string) =>
  venues.orDeny(await artistIdForSlug(artistSlug));
