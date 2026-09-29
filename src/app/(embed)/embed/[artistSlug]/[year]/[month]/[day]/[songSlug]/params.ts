import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export const searchParams = defineSearchParams({
  playImmediately: z.coerce.boolean().default(true),
});
