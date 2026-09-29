import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export const contextSearchParamsLoader = defineSearchParams({
  context: z.coerce.number().int().min(0).max(10).default(0),
});
