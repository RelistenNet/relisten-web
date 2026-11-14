import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

/** A calendar date with no year (?month=5&day=8): /today and an artist's Today In History. */
export const dateSearchParams = defineSearchParams({
  month: z.coerce.number().int().min(1).max(12).optional(),
  day: z.coerce.number().int().min(1).max(31).optional(),
});
