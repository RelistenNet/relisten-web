import { createSearchParams, fromSchema } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export default createSearchParams({
  month: fromSchema(z.string().optional()),
  day: fromSchema(z.string().optional()),
});
