import SongsIndex, { songsIndexMetadata } from '@/features/songs-index/SongsIndex';
import { getSegmentParams, redirect } from '@timber-js/app/server';
import { href } from '@timber-js/app/routes';
import { findArtistBySlug } from '@/data/artists';
import { artistSections } from '@/lib/artistSections';
import { SEGMENT_PATH } from './$segment';

export default async function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  // Switching artists keeps the section; an artist without this one gets its overview.
  const artist = await findArtistBySlug(artistSlug);
  if (artist && !artistSections(artist.features).songs) {
    redirect(href('/artists/[artistSlug]', { artistSlug }));
  }
  return <SongsIndex artistSlug={artistSlug} />;
}

export const metadata = () => songsIndexMetadata(getSegmentParams(SEGMENT_PATH));
