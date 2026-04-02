import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import VenuesColumnWithControls from './VenuesColumnWithControls';

const VenuesColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const venues = await RelistenAPI.fetchVenues(artistSlug).catch(() => {
    deny(404);
  });

  return <VenuesColumnWithControls artistSlug={artistSlug} venues={venues} />;
};

export default VenuesColumn;
