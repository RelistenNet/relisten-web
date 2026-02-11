import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import VenuesColumnWithControls from './VenuesColumnWithControls';

const VenuesColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const venues = await RelistenAPI.fetchVenues(artistSlug).catch(() => {
    notFound();
  });

  return <VenuesColumnWithControls artistSlug={artistSlug} venues={venues} />;
};

export default VenuesColumn;
