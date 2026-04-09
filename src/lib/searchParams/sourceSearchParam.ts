import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export const sourceSearchParamsLoader = defineSearchParams({
  source: z.coerce.string().default(''),
});
