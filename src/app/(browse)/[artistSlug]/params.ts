import { defineSegmentParams } from '@timber-js/app/segment-params';
import { z } from 'zod/v4';

export const segmentParams = defineSegmentParams({
  artistSlug: z.string().regex(/^[a-zA-Z0-9-]+$/),
  year: z.string().regex(/[\d]{4}/),
  month: z.string().regex(/[\dx]{1,2}/i),
  day: z.string().regex(/[\dx]{1,2}/i),
  songSlug: z.string(),
});
