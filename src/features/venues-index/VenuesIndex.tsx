import { href } from '@timber-js/app/routes';
import { artistIdForSlug, findArtistBySlug, venues } from '@/data/artists';
import { allVenues } from '@/data/venues';
import DataTable from '@/ui/table/DataTable';
import type { Column } from '@/ui/table/types';
import { tableSearchParams, toTableState } from '@/ui/table/params';
import { queryTable, type TableSpec } from '@/ui/table/query';
import { numberFormat } from '@/lib/utils';
import type { VenueListItem } from '@/domain/types';
import { Link } from '@timber-js/app/client';
import ArtistCover from '@/ui/base/ArtistCover';
import PageHeader, { type StatItem } from '@/ui/base/PageHeader';
import { deny } from '@timber-js/app/server';

// Venues as a table: every venue an artist played (/artists/phish/venues), or
// every venue across all artists (/venues), each from its cached list.

const FILTER_IDS = ['country'] as const;
const searchParams = tableSearchParams(FILTER_IDS);

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code: string) => {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
};

const baseSpec: TableSpec<VenueListItem> = {
  sorts: {
    name: (v) => v.name,
    location: (v) => v.location,
    shows: (v) => v.showCount,
  },
  defaultSort: { id: 'shows', dir: 'desc' },
  // Other names too, so "MSG" finds Madison Square Garden.
  searchText: (v) => [v.name, v.location, ...(v.otherNames ?? [])].filter(Boolean).join(' '),
  filters: [],
  pageSize: 25,
};

const allVenuesSpec: TableSpec<VenueListItem> = {
  ...baseSpec,
  filters: [
    {
      kind: 'select',
      id: 'country',
      label: 'Country',
      value: (v) => v.country ?? null,
      optionLabel: countryName,
    },
  ],
};

export default async function VenuesIndex({ artistSlug }: { artistSlug?: string }) {
  const [artist, list, params] = await Promise.all([
    artistSlug ? findArtistBySlug(artistSlug) : undefined,
    artistSlug ? venuesForArtist(artistSlug) : allVenues.get(),
    searchParams.get(),
  ]);
  if (artistSlug && !artist) deny(404);

  const spec = artistSlug ? baseSpec : allVenuesSpec;
  const result = queryTable(list, spec, toTableState(params, FILTER_IDS));
  const venueHref = (v: VenueListItem) =>
    artistSlug
      ? href('/artists/[artistSlug]/venues/[venueSlug]', { artistSlug, venueSlug: v.slug })
      : href('/venues/[venueSlug]', { venueSlug: v.slug });
  const columns: Column<VenueListItem>[] = [
    {
      id: 'name',
      label: 'Venue',
      sortable: true,
      cell: (v) => (
        <Link href={venueHref(v)} className="font-medium hover:underline">
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
      width: 'w-20 sm:w-56',
      bar: { value: (v) => v.showCount, max: Math.max(0, ...list.map((v) => v.showCount)) },
      cell: (v) => numberFormat.format(v.showCount),
    },
  ];

  const stats: StatItem[] = [{ label: 'Venues', value: numberFormat.format(list.length) }];
  if (!artistSlug) {
    const countries = new Set(list.map((v) => v.country).filter(Boolean));
    stats.push(
      {
        label: 'Shows',
        value: numberFormat.format(list.reduce((n, v) => n + v.showCount, 0)),
      },
      { label: 'Countries', value: numberFormat.format(countries.size) }
    );
  }

  return (
    <div className="detail-page flex flex-col gap-6">
      <PageHeader
        cover={artist && <ArtistCover artist={artist} />}
        title="Venues"
        meta={artistSlug ? undefined : ['Across all artists']}
        stats={stats}
      />
      <DataTable
        pathname={
          artistSlug ? href('/artists/[artistSlug]/venues', { artistSlug }) : href('/venues')
        }
        params={params}
        spec={spec}
        result={result}
        columns={columns}
        rowKey={(v) => v.id}
        rowHref={venueHref}
        minWidth="min-w-0"
        noun="venue"
        searchPlaceholder="Search venues, cities"
      />
    </div>
  );
}

export async function venuesIndexMetadata({ artistSlug }: { artistSlug?: string }) {
  if (!artistSlug) return { title: 'Venues' };
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: `Venues | ${artist.name}` } : {};
}

const venuesForArtist = async (artistSlug: string) =>
  venues.orDeny(await artistIdForSlug(artistSlug));
