import 'server-only';

import { cache as timberCache } from '@timber-js/app/cache';
import { postApiV4CatalogResolve } from './generated/client';
import type { CatalogReferenceKind, CatalogReferenceScheme } from './generated/model';
import { unwrap } from './fetcher';
import { LEGACY_SOURCE_INTEGER } from '../sourceParam';

// Pre-v4 ids still live in shared links (`?source=2173898`), social cards
// (`/album-art/<show uuid>.png`), and players' saved state. These map them to v4
// ids. Only legacy values ever reach here, so normal page loads never pay for
// it, and an old id's mapping never changes, so results are cached for a month.

const MONTH = 60 * 60 * 24 * 30;

async function resolveOne(
  kind: CatalogReferenceKind,
  scheme: CatalogReferenceScheme,
  id: string,
  artistId?: string
): Promise<string | null> {
  const { references } = await unwrap(
    postApiV4CatalogResolve({ references: [{ kind, scheme, id, artist_id: artistId ?? null }] })
  );
  const ref = references?.[0];
  return ref?.availability === 'available' ? (ref.target?.id ?? null) : null;
}

const cachedResolve = timberCache.data(resolveOne, {
  ttl: MONTH,
  key: (kind, scheme, id, artistId) => `v4:legacy:${kind}:${scheme}:${artistId ?? ''}:${id}`,
});

/** A legacy `?source=` value (integer id or v3 uuid) → v4 source id, or null if it's gone. */
export function resolveLegacySource(artistId: string, param: string) {
  const scheme = LEGACY_SOURCE_INTEGER.test(param) ? 'legacy_integer' : 'legacy_uuid';
  // Integer ids are only unique per artist, so the API requires artist_id for them.
  return cachedResolve('source', scheme, param, artistId);
}

/** A v3 show uuid → v4 show id, or null if it's gone. */
export function resolveLegacyShow(showUuid: string) {
  return cachedResolve('show', 'legacy_uuid', showUuid);
}
