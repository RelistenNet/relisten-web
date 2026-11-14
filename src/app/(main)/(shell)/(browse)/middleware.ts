import { deny, redirect, type MiddlewareContext } from '@timber-js/app/server';
import { isLegacySourceParam, toSourceParam } from '@/lib/sourceParam';
import { findArtistBySlug } from '@/data/artists';
import { resolveLegacySource } from '@/data/legacy';

export default async function middleware(ctx: MiddlewareContext): Promise<Response | void> {
  ctx.headers.set('Cache-Control', 'private, no-cache, no-store');

  // Malformed segments (devtools .map requests, scanners) already 404 in
  // schema.ts, which runs before middleware.
  const { artistSlug } = ctx.segmentParams;
  if (typeof artistSlug !== 'string') return;

  // Served from the cached artist directory (see artistDirectory.ts).
  const artist = await findArtistBySlug(artistSlug);
  if (!artist) deny(404);

  // Links shared before v4 carry an integer source id (or a v3 uuid). Point them
  // at the v4 id once, permanently; only these old links pay for the lookup.
  const url = new URL(ctx.req.url);
  const source = url.searchParams.get('source');

  if (source && isLegacySourceParam(source)) {
    const sourceId = await resolveLegacySource(artist.id, source).catch(() => null);
    if (sourceId) url.searchParams.set('source', toSourceParam(sourceId));
    else url.searchParams.delete('source');
    redirect(`${url.pathname}${url.search}`, { permanent: Boolean(sourceId) });
  }
}
