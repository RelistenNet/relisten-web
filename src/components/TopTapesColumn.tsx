import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import type { ReactNode } from 'react';
import { deny } from '@timber-js/app/server';
import TopTapesColumnWithControls from './TopTapesColumnWithControls';

const TopTapesColumn = async ({ artistSlug, year, subHeader }: Pick<RawParams, 'artistSlug' | 'year'> & { subHeader?: ReactNode }) => {
  const shows = await RelistenAPI.fetchTopShows(artistSlug).catch(() => {
    deny(404);
  });

  return (
    <TopTapesColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={shows}
      subHeader={subHeader}
    />
  );
};

export default TopTapesColumn;
