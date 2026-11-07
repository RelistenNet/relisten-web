import { z } from 'zod/v4';
import { songSearchParams } from '@/features/song-detail/spec';

const slug = z
  .string()
  .regex(/^[a-z0-9-]+$/i)
  .max(200);

/**
 * /api/queue's query. Either `shows` (comma-separated show ids, for stream
 * URLs after a reload), or `artist` + `song` plus the song table's own params
 * (q, sort, year, sbd) for a song page's whole "play" queue.
 */
export const queueSearchParams = songSearchParams.extend({
  shows: z
    .string()
    .regex(/^[a-z0-9_-]+(,[a-z0-9_-]+)*$/i)
    .max(4000)
    .optional(),
  artist: slug.optional(),
  song: slug.optional(),
});

/** At most this many shows per request. */
export const MAX_QUEUE_SHOWS = 50;
