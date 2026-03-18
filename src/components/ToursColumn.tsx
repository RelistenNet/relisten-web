import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from '@timber-js/app/server';
import ToursColumnWithControls from './ToursColumnWithControls';

const ToursColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const tours = await RelistenAPI.fetchTours(artistSlug).catch(() => {
    notFound();
  });

  return <ToursColumnWithControls artistSlug={artistSlug} tours={tours} />;
};

export default ToursColumn;
