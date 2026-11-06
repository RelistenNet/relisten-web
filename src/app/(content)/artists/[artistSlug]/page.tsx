import ArtistShowList from '@/components/detail/ArtistShowList';
import StatGrid, { type StatItem } from '@/components/detail/StatGrid';
import { showColumns } from '@/components/table/showColumns';
import RelistenAPI from '@/lib/RelistenAPI';
import { showStats } from '@/lib/table/showStats';
import { artistUrl } from '@/lib/urls';
import { numberFormat } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// An artist's overview: totals, shows per year, and every show as a table.

export default async function ArtistPage() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  const [artist, rows] = await Promise.all([
    RelistenAPI.findArtist(artistSlug),
    RelistenAPI.fetchAllShowRows(artistSlug),
  ]);
  if (!artist) deny(404);

  const years = [...showStats(rows).byYear.keys()].sort();
  const statItems: StatItem[] = [
    { label: 'Shows', value: numberFormat.format(artist.show_count ?? rows.length) },
    { label: 'Tapes', value: numberFormat.format(artist.source_count ?? 0) },
  ];
  if (years.length) {
    statItems.push({
      label: 'Years',
      value: `${years[0]}–${years[years.length - 1]}`,
      detail: `${years.length} with shows`,
    });
  }

  return (
    <ArtistShowList
      artistSlug={artistSlug}
      artistName={artist.name ?? artistSlug}
      title={artist.name ?? artistSlug}
      breadcrumb="Artist"
      rows={rows}
      columns={[showColumns.show, showColumns.tapes, showColumns.rating, showColumns.plays]}
      defaultSort={{ id: 'date', dir: 'desc' }}
      pathname={artistUrl(artistSlug)}
      yearChart
    >
      <StatGrid items={statItems} />
    </ArtistShowList>
  );
}

export const metadata = async () => {
  const artist = await RelistenAPI.findArtist(getSegmentParams(SEGMENT_PATH).artistSlug);
  return artist ? { title: artist.name } : {};
};
