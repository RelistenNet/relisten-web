import { createSearchParams, fromSchema } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

export default createSearchParams({
  playImmediately: fromSchema(z.coerce.boolean().default(true)),
});
