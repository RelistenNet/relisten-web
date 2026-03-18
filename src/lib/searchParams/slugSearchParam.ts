import { createSearchParams, fromSchema } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export const slugSearchParams = createSearchParams({
  slug: fromSchema(z.string().optional()),
});
