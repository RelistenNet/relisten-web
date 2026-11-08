import 'server-only';

import { redirect } from '@timber-js/app/server';
import { href } from '@timber-js/app/routes';
import { findArtistBySlug } from '@/data/artists';
import { artistSections } from './artistSections';

/**
 * Switching artists keeps the section; an artist without this one gets its
 * overview.
 */
export async function requireArtistSection(
  artistSlug: string,
  section: keyof ReturnType<typeof artistSections>
) {
  const artist = await findArtistBySlug(artistSlug);
  if (artist && !artistSections(artist.features)[section]) {
    redirect(href('/artists/[artistSlug]', { artistSlug }));
  }
}
