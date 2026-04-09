import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export const dateSearchParams = defineSearchParams({
  month: z.string().optional(),
  day: z.string().optional(),
});
