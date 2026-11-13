import { getSegmentParams, type PageOptions } from '@timber-js/app/server';
import NavBar from '@/shell/NavBar';
import { SEGMENT_PATH } from './$segment';

// Keyed on the artist and the user agent: navigating within an artist's
// pages skips the nav without rendering it.
export const pageOptions = {
  lifetime: 'document',
  key: { segmentParams: ['artistSlug'], headers: ['user-agent'] },
} satisfies PageOptions;

export default function ArtistContentNav() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <NavBar artistSlug={artistSlug} />;
}
