import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import { toSourceParam } from '@/lib/sourceParam';

export const sourceSearchParamsLoader = defineSearchParams({
  source: z.coerce.string().default(''),
});

/** `path?source=…` for a show or track page: a source id, prefixed or not. */
export const sourceHref = (path: string, source: string | null | undefined) =>
  sourceSearchParamsLoader.href(path, { source: toSourceParam(source) });
