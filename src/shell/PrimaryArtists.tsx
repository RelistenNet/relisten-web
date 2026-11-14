import 'server-only';

import { getArtistColumnRows } from '@/lib/artistColumnRows';
import { PrimaryArtistsProvider } from './primaryArtistsContext';

/**
 * Provides the primary artists to the whole app (the nav's artist pickers,
 * the browse view's artists column), from the root layout.
 *
 * The root layout is lifetime: 'document', so this renders on the document
 * request and client navigations skip it: the rows are sent once per visit.
 * They are only as fresh as the page load, which suits a list that changes
 * rarely.
 */
export default async function PrimaryArtists({ children }: { children: React.ReactNode }) {
  const { primary } = await getArtistColumnRows();
  return <PrimaryArtistsProvider rows={primary}>{children}</PrimaryArtistsProvider>;
}
