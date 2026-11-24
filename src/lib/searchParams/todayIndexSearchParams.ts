import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

// The Today page's artist index: its order (`order`, not the table's `sort`), and
// the artist scrolled to.
export const todayIndexSearchParams = defineSearchParams({
  order: z.enum(['default', 'alpha', 'count']).default('default'),
  dir: z.enum(['asc', 'desc']).default('asc'),
  anchor: z.string().optional(),
});
