import { getArtistColumnRows } from '@/lib/artistColumnRows';

// The archive artists (~4k rows) for the artists column. Served separately so
// pages don't serialize the list into every RSC payload; the browser and any
// CDN can cache it instead. The TTL matches the server-side artists cache.
export async function GET() {
  const { archiveJson } = await getArtistColumnRows();

  return new Response(archiveJson, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
