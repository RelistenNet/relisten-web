import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

// The app's own /api routes' queries, shared so the client builds the same URLs
// the route handlers parse.

/** /api/live/summary: plays today (the listener's calendar date). */
export const liveSummarySearchParams = defineSearchParams({
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
});

/** /api/live/history: the plays after a sequence number. */
export const liveHistorySearchParams = defineSearchParams({
  /** Only plays with a higher sequence number than this. */
  after: z.coerce.number().int().min(0).default(0),
});

/** /api/search: catalog search. */
export const searchSearchParams = defineSearchParams({
  q: z.string().trim().max(100).default(''),
});
