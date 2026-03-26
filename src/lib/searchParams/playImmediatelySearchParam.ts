import { defineSearchParams, fromSchema } from '@timber-js/app/params';
import { z } from 'zod/v4';

export const playImmediatelySearchParamsLoader = defineSearchParams({
  playImmediately: fromSchema(z.coerce.boolean().default(true)),
});
