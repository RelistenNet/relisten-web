import { z } from 'zod/v4';
import { trackSearchParams } from '@/lib/searchParams/trackSearchParams';

/** A track page's query, plus how many neighbouring tracks the embed lists. */
export const contextSearchParamsLoader = trackSearchParams.extend({
  context: z.coerce.number().int().min(0).max(10).default(0),
});
