import 'server-only';

import { getHeaders } from '@timber-js/app/server';
import { getArtistColumnRows } from '@/lib/artistColumnRows';
import { PrimaryArtistsProvider } from './primaryArtistsContext';

/**
 * Provides the primary artists to the whole app (the nav's artist pickers,
 * the browse view's artists column), from the root layout.
 *
 * Sent once per document: every visit starts with a document request, and
 * the client provider (mounted for the whole visit) keeps those rows. RSC
 * payloads (navigations, action responses) leave them out. The rows are only as fresh as the page load, which suits a list
 * that changes rarely.
 */
export default async function PrimaryArtists({ children }: { children: React.ReactNode }) {
  const headers = await getHeaders();
  // timber's own check (isRscRequest) isn't exported: Accept is a list, so match a substring.
  const isRsc = (headers.get('accept') ?? '').includes('text/x-component');
  if (isRsc) return <PrimaryArtistsProvider>{children}</PrimaryArtistsProvider>;
  const { primary } = await getArtistColumnRows();
  return <PrimaryArtistsProvider rows={primary}>{children}</PrimaryArtistsProvider>;
}
