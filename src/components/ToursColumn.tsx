import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import type { ReactNode } from 'react';
import { deny } from '@timber-js/app/server';
import ToursColumnWithControls from './ToursColumnWithControls';

const ToursColumn = async ({ artistSlug, subHeader }: Pick<RawParams, 'artistSlug'> & { subHeader?: ReactNode }) => {
  const tours = await RelistenAPI.fetchTours(artistSlug).catch(() => {
    deny(404);
  });

  return <ToursColumnWithControls artistSlug={artistSlug} tours={tours} subHeader={subHeader} />;
};

export default ToursColumn;
