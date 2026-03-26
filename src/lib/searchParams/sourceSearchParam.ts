import { defineSearchParams, fromSchema } from '@timber-js/app/params';
import { z } from 'zod/v4';

export const sourceSearchParamsLoader = defineSearchParams({
  source: fromSchema(z.coerce.string().default('')),
});
