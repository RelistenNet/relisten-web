import { createSearchParams } from '@/lib/searchParams/createSearchParams';
import { parseAsBoolean } from 'nuqs/server';
import { z } from 'zod/v4';

export const playImmediatelySchema = z.object({
  playImmediately: z.boolean().nullable(),
});

export const playImmediatelyParser = {
  playImmediately: parseAsBoolean.withDefault(true),
};

export const playImmediatelySearchParamsLoader = createSearchParams(
  playImmediatelySchema,
  playImmediatelyParser
);
