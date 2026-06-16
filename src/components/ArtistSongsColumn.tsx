import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import type { ReactNode } from 'react';
import { deny } from '@timber-js/app/server';
import ArtistSongsColumnWithControls from './ArtistSongsColumnWithControls';

const ArtistSongsColumn = async ({ artistSlug, subHeader }: Pick<RawParams, 'artistSlug'> & { subHeader?: ReactNode }) => {
  const songs = await RelistenAPI.fetchSongs(artistSlug).catch(() => {
    deny(404);
  });

  return <ArtistSongsColumnWithControls artistSlug={artistSlug} songs={songs ?? []} subHeader={subHeader} />;
};

export default ArtistSongsColumn;
