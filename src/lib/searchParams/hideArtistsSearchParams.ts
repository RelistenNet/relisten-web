import { createSearchParams } from '@/lib/searchParams/createSearchParams';
import { parseAsBoolean } from 'nuqs/server';
import { z } from 'zod/v4';

export const hideArtistsSchema = z.object({
  hideArtists: z.boolean().nullable(),
});

export const hideArtistsParser = {
  hideArtists: parseAsBoolean.withDefault(false),
};

export const hideArtistsSearchParamsLoader = createSearchParams(
  hideArtistsSchema,
  hideArtistsParser
);
