import { z } from 'zod/v4';
import { songSearchParams } from '@/features/song-detail/spec';

const slug = z
  .string()
  .regex(/^[a-z0-9-]+$/i)
  .max(200);

/** /api/queue's query: the song, plus the song table's own params (q, sort, year, sbd). */
export const queueSearchParams = songSearchParams.extend({
  artist: slug.optional(),
  song: slug.optional(),
});
