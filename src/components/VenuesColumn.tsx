import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import type { ReactNode } from 'react';
import { deny } from '@timber-js/app/server';
import VenuesColumnWithControls from './VenuesColumnWithControls';

const VenuesColumn = async ({ artistSlug, subHeader }: Pick<RawParams, 'artistSlug'> & { subHeader?: ReactNode }) => {
  const venues = await RelistenAPI.fetchVenues(artistSlug).catch(() => {
    deny(404);
  });

  return <VenuesColumnWithControls artistSlug={artistSlug} venues={venues} subHeader={subHeader} />;
};

export default VenuesColumn;
