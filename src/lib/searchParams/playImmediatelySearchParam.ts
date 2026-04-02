import { defineSearchParams } from '@timber-js/app/search-params';
import { fromSchema } from '@timber-js/app/codec';
import { z } from 'zod/v4';

export const playImmediatelySearchParamsLoader = defineSearchParams({
  playImmediately: fromSchema(z.coerce.boolean().default(true)),
});
