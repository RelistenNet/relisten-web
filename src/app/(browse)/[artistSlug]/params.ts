import { defineSegmentParams } from '@timber-js/app/params';
import { z } from 'zod/v4';

export const params = defineSegmentParams({
  artistSlug: z.string().regex(/^[a-zA-Z0-9-]+$/),
});
