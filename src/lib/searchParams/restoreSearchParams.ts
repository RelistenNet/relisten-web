import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

/** /api/restore's query: the saved show's artist and date, and its `?source=` value. */
export const restoreSearchParams = defineSearchParams({
  artist: z.string().regex(/^[a-z0-9-]+$/i),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z
    .string()
    .regex(/^[a-z0-9_-]*$/i)
    .default(''),
});
