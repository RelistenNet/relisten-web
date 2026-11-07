import { isMissing } from '@/data/resource';
import { showById } from '@/data/shows';
import { songQueue, songQueueParams } from '@/features/song-detail/queue';
import { MAX_QUEUE_SHOWS, queueSearchParams } from '@/lib/searchParams/queueSearchParams';
import { urlsOf, type UrlMap } from '@/player/queue/items';
import type { TableParams } from '@/ui/table/params';

// The play queue's data. The queue is saved without stream URLs, so after a
// reload the player asks here for the URLs of the shows it holds. A song
// page's play buttons ask here for the song's whole queue.
//
//   ?shows=a,b                         → { urls, failed }
//   ?artist=…&song=…&q=…&sort=…&year=… → { ref, label, items, urls }
//
// deny() doesn't work in route handlers, so failures return a Response.

const json = (body: unknown, { cache = true } = {}) =>
  Response.json(body, {
    headers: { 'Cache-Control': cache ? 'private, max-age=60' : 'no-store' },
  });

export async function GET() {
  let params: ReturnType<typeof queueSearchParams.get>;
  try {
    params = queueSearchParams.get();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (params.artist && params.song) {
    try {
      return json(
        await songQueue(params.artist, params.song, songQueueParams(params as TableParams))
      );
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }

  const ids = [...new Set((params.shows ?? '').split(',').filter(Boolean))];
  if (!ids.length) return new Response('shows, or artist and song, are required', { status: 400 });
  if (ids.length > MAX_QUEUE_SHOWS) return new Response('Too many shows', { status: 400 });

  // A show that doesn't exist has no URLs. Any other error (a timeout, a 5xx)
  // is reported in `failed`, so the player retries it, and isn't cached.
  const urls: UrlMap = {};
  const failed: string[] = [];
  const shows = await Promise.all(
    ids.map((id) =>
      showById.get(id).catch((err: unknown) => {
        if (!isMissing(err)) failed.push(id);
        return null;
      })
    )
  );
  for (const show of shows) {
    for (const source of show?.sources ?? []) {
      Object.assign(urls, urlsOf(source.sets.flatMap((set) => set.tracks ?? [])));
    }
  }
  return json({ urls, failed }, { cache: failed.length === 0 });
}
