import { songQueue, songQueueParams } from '@/features/song-detail/queue';
import { queueSearchParams } from '@/lib/searchParams/queueSearchParams';
import type { TableParams } from '@/ui/table/params';

// A song page's play queue: every performance matching the page's filters, in
// table order. The page renders one page of rows, so its play buttons start
// the clicked row at once and fetch the rest from here.
//
//   ?artist=…&song=…&q=…&sort=…&year=…&sbd= → { ref, label, items }
//
// deny() doesn't work in route handlers, so failures return a Response.

export async function GET() {
  let params: ReturnType<typeof queueSearchParams.get>;
  try {
    params = queueSearchParams.get();
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (!params.artist || !params.song) {
    return new Response('artist and song are required', { status: 400 });
  }
  try {
    const queue = await songQueue(
      params.artist,
      params.song,
      songQueueParams(params as TableParams)
    );
    return Response.json(queue, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
