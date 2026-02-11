import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import React from 'react';
import { notFound } from 'next/navigation';
import ArtistSongsColumnWithControls from './ArtistSongsColumnWithControls';

const ArtistSongsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const songs = await RelistenAPI.fetchSongs(artistSlug).catch(() => {
    notFound();
  });

  return <ArtistSongsColumnWithControls artistSlug={artistSlug} songs={songs} />;
};

export default ArtistSongsColumn;
