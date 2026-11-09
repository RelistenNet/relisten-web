import 'server-only';

import { getArtistColumnRows } from '@/lib/artistColumnRows';
import { PrimaryArtistsProvider } from './primaryArtistsContext';

/**
 * Provides the primary artists to the layout's subtree (the nav's artist
 * picker, the browse view's artists column). The much longer archive list is
 * fetched by the client from /api/artists/archive instead.
 */
export default async function PrimaryArtists({ children }: { children: React.ReactNode }) {
  const { primary } = await getArtistColumnRows();
  return <PrimaryArtistsProvider rows={primary}>{children}</PrimaryArtistsProvider>;
}
