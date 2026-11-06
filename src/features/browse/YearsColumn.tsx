import { loadArtists, loadYears } from './load';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import YearsColumnWithControls from './YearsColumnWithControls';
import TodayInHistoryRow from './TodayInHistoryRow';
import RowHeader from '@/components/RowHeader';

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const artists = await loadArtists().catch(() => {
    deny(404);
  });

  const artist = artists?.find((artist) => artist.slug === artistSlug);
  const artistYears = await (artist ? loadYears(artist.id) : []);

  return (
    <YearsColumnWithControls
      artistSlug={artistSlug}
      artistName={artist?.name}
      artistYears={artistYears || []}
    >
      <TodayInHistoryRow key="today" artistSlug={artistSlug} />
      <RowHeader key="years-header">Years</RowHeader>
    </YearsColumnWithControls>
  );
};

export default YearsColumn;
