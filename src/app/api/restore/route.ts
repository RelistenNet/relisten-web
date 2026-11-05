import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import RelistenAPI from '@/lib/RelistenAPI';
import { fromSourceParam, isLegacySourceParam } from '@/lib/sourceParam';
import { resolveLegacySource } from '@/lib/v4/legacy';

// Restores the player after a reload: the browser saved the show's URL parts and
// `?source=`, and gets back just the source to load. Server-side because v4
// addresses shows by artist id, and saved state from before v4 can hold a legacy
// source id that has to be resolved.
const searchParams = defineSearchParams({
  artist: z.string().regex(/^[a-z0-9-]+$/i),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z
    .string()
    .regex(/^[a-z0-9_-]*$/i)
    .default(''),
});

export async function GET() {
  let params: { artist?: string; date?: string; source: string } | undefined;
  try {
    params = searchParams.get();
  } catch {
    // Falls through to the 400 below.
  }
  if (!params?.artist || !params.date) {
    return new Response('artist and date (YYYY-MM-DD) are required', { status: 400 });
  }

  const artist = await RelistenAPI.findArtist(params.artist);
  if (!artist) return new Response('Not Found', { status: 404 });

  const [show, legacySourceId] = await Promise.all([
    RelistenAPI.fetchShow(params.artist, undefined, params.date).catch(() => null),
    isLegacySourceParam(params.source) ? resolveLegacySource(artist.id, params.source) : null,
  ]);
  if (!show?.sources?.length) return new Response('Not Found', { status: 404 });

  const wanted = legacySourceId ?? fromSourceParam(params.source);
  const source = show.sources.find((s) => s.id === wanted) ?? show.sources[0];

  return Response.json({ source }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
