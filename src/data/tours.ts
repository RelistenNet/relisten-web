import 'server-only';

import { deny } from '@timber-js/app/server';
import { unwrap } from '@/api/fetcher';
import { getApiV4ToursTourId } from '@/api/generated/client';
import type { TourDetail } from '@/domain/types';
import { artistIdForSlug, tours } from './artists';
import { defineResource, MINUTES } from './resource';
import { toShowSummaries } from './summaries';

const tour = defineResource({
  name: 'tour',
  ttl: 5 * MINUTES,
  load: (tourId: string) => unwrap(getApiV4ToursTourId(tourId)),
  slim: (t): TourDetail => ({
    id: t.id,
    name: t.name ?? 'Unknown tour',
    startDate: t.start_date?.slice(0, 10),
    endDate: t.end_date?.slice(0, 10),
    shows: toShowSummaries(t.shows),
  }),
});

/** A tour's page data. Tour slugs are stable in v4; the cached tour list maps slug → id. */
export async function tourDetail(artistSlug: string, tourSlug: string) {
  const list = await tours.orDeny(await artistIdForSlug(artistSlug));
  const found = list.find((t) => t.slug === tourSlug);
  if (!found) deny(404);
  return tour.orDeny(found.id);
}
