import 'server-only';

import { unwrap } from '@/api/fetcher';
import { getApiV4SourcesSourceIdReviews } from '@/api/generated/client';
import { toSourceReviews } from './adapters';
import { defineResource, MINUTES } from './resource';

/** One tape's reviews, in the API's order. */
export const sourceReviews = defineResource({
  name: 'source-reviews',
  ttl: 30 * MINUTES,
  load: (sourceId: string) => unwrap(getApiV4SourcesSourceIdReviews(sourceId)),
  slim: toSourceReviews,
});
