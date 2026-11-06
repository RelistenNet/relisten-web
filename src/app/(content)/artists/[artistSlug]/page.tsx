import StatGrid, { type StatItem } from '@/components/detail/StatGrid';
import YearChart from '@/components/detail/YearChart';
import RelistenAPI from '@/lib/RelistenAPI';
import { artistSongsUrl, artistVenuesUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
import { Link } from '@timber-js/app/client';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// An artist's overview: totals, shows per year, and links to its indexes.

export default async function ArtistPage() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  const artist = await RelistenAPI.findArtist(artistSlug);
  if (!artist) deny(404);
  const years = await RelistenAPI.fetchYears(artist.id);

  const byYear = new Map(
    years.filter((y) => y.year).map((y) => [y.year as string, y.show_count ?? 0])
  );
  const yearList = [...byYear.keys()].sort();

  const statItems: StatItem[] = [
    { label: 'Shows', value: numberFormat.format(artist.show_count ?? 0) },
    { label: 'Tapes', value: numberFormat.format(artist.source_count ?? 0) },
  ];
  if (yearList.length) {
    statItems.push({
      label: 'Years',
      value: `${yearList[0]}–${yearList[yearList.length - 1]}`,
      detail: `${yearList.length} with shows`,
    });
  }

  const links = [
    { href: `/${artistSlug}`, label: 'Browse shows' },
    { href: artistSongsUrl(artistSlug), label: 'Songs' },
    { href: artistVenuesUrl(artistSlug), label: 'Venues' },
  ];

  return (
    <div className="detail-page flex flex-col gap-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-base text-text-muted sm:text-sm">Artist</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-text-primary">
            {artist.name}
          </h1>
        </div>
        <StatGrid items={statItems} />
        <YearChart
          counts={byYear}
          noun="show"
          hrefFor={(year) => (year ? `/${artistSlug}/${year}` : `/${artistSlug}`)}
        />
      </header>

      <nav aria-label={`${artist.name} pages`}>
        <ul role="list" className="flex flex-wrap gap-3">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="
                  inline-flex rounded-lg px-4 py-2 text-base text-text-primary inset-ring
                  inset-ring-hairline hover:bg-surface-hover sm:text-sm
                "
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export const metadata = async () => {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  const artist = await RelistenAPI.findArtist(artistSlug);
  return artist ? { title: artist.name } : {};
};
