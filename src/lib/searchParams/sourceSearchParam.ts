import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import { toSourceParam } from '@/lib/sourceParam';

export const sourceSearchParamsLoader = defineSearchParams({
  source: z.coerce.string().default(''),
});

/** The `source=…` query for a show or track link: a source id, prefixed or not. */
export const sourceQuery = (source: string | null | undefined) =>
  sourceSearchParamsLoader.buildSearchParams({ source: toSourceParam(source) });
