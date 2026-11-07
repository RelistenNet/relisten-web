import 'server-only';

import { unwrap } from '@/api/fetcher';
import {
  getApiV4ImportedVenuesImportedVenueId,
  getApiV4Venues,
  getApiV4VenuesBySlugSlug,
} from '@/api/generated/client';
import type { VenueDetail, VenueListItem } from '@/domain/types';
import { IMPORTED_VENUE_PREFIX, venueLocation } from './adapters';
import { defineResource, MINUTES, pathParam } from './resource';
import { toShowSummaries } from './summaries';

/**
 * Every canonical venue, across all artists (about 4,800). The response is
 * ~1.3MB; the cached list keeps only what the venues table reads.
 */
export const allVenues = defineResource({
  name: 'all-venues',
  ttl: 30 * MINUTES,
  load: () => unwrap(getApiV4Venues()),
  slim: (list): VenueListItem[] =>
    list.flatMap((v): VenueListItem[] => {
      if (!v.slug) return [];
      const otherNames = (v.names ?? []).map((n) => n.name ?? '').filter((n) => n && n !== v.name);
      return [
        {
          id: v.id,
          slug: v.slug,
          name: v.name ?? undefined,
          location: venueLocation(v) || undefined,
          showCount: v.global_show_count,
          country: v.country ?? undefined,
          otherNames: otherNames.length ? otherNames : undefined,
        },
      ];
    }),
});

const canonicalVenue = defineResource({
  name: 'venue',
  ttl: 5 * MINUTES,
  load: (slug: string) => unwrap(getApiV4VenuesBySlugSlug(pathParam(slug))),
  slim: (v): VenueDetail => ({
    id: v.id,
    name: v.name ?? 'Unknown venue',
    location: venueLocation(v) || undefined,
    // Official and short names; the API leaves out matching-only spellings.
    otherNames: [...new Set((v.names ?? []).map((n) => n.name ?? ''))].filter(
      (n) => n && n !== v.name
    ),
    shows: toShowSummaries(v.shows),
  }),
});

const importedVenue = defineResource({
  name: 'imported-venue',
  ttl: 5 * MINUTES,
  load: (venueId: string) => unwrap(getApiV4ImportedVenuesImportedVenueId(pathParam(venueId))),
  slim: (iv): VenueDetail => ({
    id: iv.id,
    name: iv.name ?? 'Unknown venue',
    location: iv.location ?? undefined,
    otherNames: iv.past_names ? [iv.past_names] : [],
    shows: toShowSummaries(iv.shows),
  }),
});

/** A venue's page data: a canonical venue slug, or an imported venue's id. 404s if unknown. */
export const venueDetail = (venue: string) =>
  venue.startsWith(IMPORTED_VENUE_PREFIX)
    ? importedVenue.orDeny(venue)
    : canonicalVenue.orDeny(venue);
