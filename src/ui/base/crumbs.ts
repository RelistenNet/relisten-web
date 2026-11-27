import { href } from '@timber-js/app/routes';

/** One step of a PageHeader's trail: a page this one sits under. No href: a label only. */
export type Crumb = { label: string; href?: string };

type ArtistRef = { slug: string; name: string };

/**
 * The first step on the site's own pages (Playlists, Today in History, Live,
 * Venues): the artist bar's "All artists" group, as an artist's pages start
 * with the artist.
 */
export const ALL_ARTISTS_CRUMB: Crumb = { label: 'All artists' };

/**
 * The artist, the first step on every artist page. A label, not a link: the
 * artist's page is its Shows tab, which is either this page or the next step.
 */
export const artistCrumb = (artist: ArtistRef): Crumb => ({ label: artist.name });

/** The trail to one of an artist's lists: "Grateful Dead › Songs". */
export function artistListCrumbs(artist: ArtistRef, list: 'shows' | 'songs' | 'venues'): Crumb[] {
  const artistSlug = artist.slug;
  const listCrumb: Crumb =
    list === 'shows'
      ? { label: 'Shows', href: href('/artists/[artistSlug]', { artistSlug }) }
      : list === 'songs'
        ? { label: 'Songs', href: href('/artists/[artistSlug]/songs', { artistSlug }) }
        : { label: 'Venues', href: href('/artists/[artistSlug]/venues', { artistSlug }) };
  return [artistCrumb(artist), listCrumb];
}
