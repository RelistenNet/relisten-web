import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export const todayIndexSearchParams = defineSearchParams({
  sort: z.enum(['default', 'alpha', 'count']).default('default'),
  dir: z.enum(['asc', 'desc']).default('asc'),
  anchor: z.string().optional(),
});
