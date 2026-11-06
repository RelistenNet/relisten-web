import { loadArtistShows } from './load';
import { findArtistBySlug } from '@/data/artists';
import ArtistShowList from './ArtistShowList';
import type { StatItem } from '@/ui/base/PageHeader';
import { showColumns } from '@/ui/shows/columns';
import { showStats } from '@/ui/shows/stats';
import { artistUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
import { deny } from '@timber-js/app/server';

// An artist's overview: totals, shows per year, and every show as a table.

export default async function ArtistOverview({ artistSlug }: { artistSlug: string }) {
  const [artist, rows] = await Promise.all([
    findArtistBySlug(artistSlug),
    loadArtistShows(artistSlug),
  ]);
  if (!artist) deny(404);

  const years = [...showStats(rows).byYear.keys()].sort();
  const statItems: StatItem[] = [
    { label: 'Shows', value: numberFormat.format(artist.showCount) },
    { label: 'Tapes', value: numberFormat.format(artist.sourceCount) },
  ];
  if (years.length) {
    statItems.push({
      label: 'Years',
      value: `${years[0]}–${years[years.length - 1]}`,
    });
  }

  return (
    <ArtistShowList
      artist={artist}
      title={artist.name}
      stats={statItems}
      rows={rows}
      columns={[showColumns.show, showColumns.tapes, showColumns.rating, showColumns.plays]}
      defaultSort={{ id: 'date', dir: 'desc' }}
      pathname={artistUrl(artistSlug)}
      yearChart
    />
  );
}

export async function artistOverviewMetadata({ artistSlug }: { artistSlug: string }) {
  const artist = await findArtistBySlug(artistSlug);
  return artist ? { title: artist.name } : {};
}
