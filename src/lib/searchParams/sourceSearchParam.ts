import { createSearchParams, fromSchema } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export const sourceSearchParamsLoader = createSearchParams({
  source: fromSchema(z.coerce.string().default('')),
});
