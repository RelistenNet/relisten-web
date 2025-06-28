import { createSearchParams } from '@/lib/searchParams/createSearchParams';
import { parseAsString } from 'nuqs/server';
import { z } from 'zod/v4';

export const sourceSchema = z.object({
  source: z.string().nullable(),
});

export const sourceParser = {
  source: parseAsString.withDefault(''),
};

export const sourceSearchParamsLoader = createSearchParams(sourceSchema, sourceParser);
