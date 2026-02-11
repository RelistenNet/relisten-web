import { createSearchParams } from '@/lib/searchParams/createSearchParams';
import { parseAsString } from 'nuqs/server';
import { z } from 'zod/v4';

export const slugSchema = z.object({
  slug: z.string().nullable(),
});

export const slugParser = {
  slug: parseAsString,
};

export const slugSearchParams = createSearchParams(slugSchema, slugParser);
