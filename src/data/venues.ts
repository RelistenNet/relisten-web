import 'server-only';

import { unwrap } from '@/api/fetcher';
import {
  getApiV4ImportedVenuesImportedVenueId,
  getApiV4VenuesBySlugSlug,
} from '@/api/generated/client';
import type { VenueDetail } from '@/domain/types';
import { IMPORTED_VENUE_PREFIX, venueLocation } from './adapters';
import { defineResource, MINUTES, pathParam } from './resource';
import { toShowSummaries } from './summaries';

const canonicalVenue = defineResource({
  name: 'venue',
  ttl: 5 * MINUTES,
  load: (slug: string) => unwrap(getApiV4VenuesBySlugSlug(pathParam(slug))),
  slim: (v): VenueDetail => ({
    id: v.id,
    name: v.name ?? 'Unknown venue',
    location: venueLocation(v) || undefined,
    // Spelling variants ("Madison Sqaure Garden") are for matching, not display.
    otherNames: [
      ...new Set((v.names ?? []).filter((n) => n.kind !== 'spelling').map((n) => n.name ?? '')),
    ].filter((n) => n && n !== v.name),
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
