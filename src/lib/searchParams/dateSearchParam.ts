import { createSearchParams } from '@/lib/searchParams/createSearchParams';
import { parseAsString } from 'nuqs/server';
import { z } from 'zod/v4';

export const dateSchema = z.object({
  month: z.string().nullable(),
  day: z.string().nullable(),
});

export const dateParser = {
  month: parseAsString,
  day: parseAsString,
};

export const dateSearchParams = createSearchParams(dateSchema, dateParser);
