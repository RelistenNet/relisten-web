import { defineSearchParams } from '@timber-js/app/segment-params';
import { fromSchema } from '@timber-js/app/codec';
import { z } from 'zod/v4';

export const sourceSearchParamsLoader = defineSearchParams({
  source: fromSchema(z.coerce.string().default('')),
});
