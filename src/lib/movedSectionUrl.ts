import {
  artistRecentlyAddedUrl,
  artistSongsUrl,
  artistTodayUrl,
  artistToursUrl,
  artistTopShowsUrl,
  artistVenuesUrl,
  songUrl,
  tourUrl,
  venueUrl,
} from './urls';

import { sourceSearchParamsLoader } from './searchParams/sourceSearchParam';

// Pure, so it can be tested apart from the browse middleware that uses it.

/**
 * Where an old browse section URL lives now, or null if it isn't one:
 *   /gd/top → /artists/gd?sort=-rating              /gd/songs → /artists/gd/songs
 *   /gd/songs?slug=x → the song page       /gd/today-in-history/5/8 → ?month=5&day=8
 *   /gd/songs?slug=x&date=1977-05-08[&track=t] → that show (on that track)
 */
export function movedQuickHitUrl(artist: string, segments: string[], query: URLSearchParams) {
  const section = segments[1];
  // Query values are untrusted: encode them so a value can't add path segments
  // or query params to the redirect target.
  const param = (name: string) => {
    const value = query.get(name);
    return value ? encodeURIComponent(value) : undefined;
  };
  const slug = param('slug');
  const date = query.get('date');
  const track = param('track');

  switch (section) {
    case 'top':
      return artistTopShowsUrl(artist);
    case 'recently-added':
      return artistRecentlyAddedUrl(artist);
    case 'today-in-history':
      // artistTodayUrl keeps only a valid month and day.
      return artistTodayUrl(
        artist,
        segments[2] ?? query.get('month') ?? undefined,
        segments[3] ?? query.get('day') ?? undefined
      );
    case 'songs':
    case 'venues':
    case 'tours': {
      // A show was open in the section: go to the show itself.
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const show = `/${artist}/${date.replaceAll('-', '/')}`;
        return sourceSearchParamsLoader.href(track ? `${show}/${track}` : show, {
          source: query.get('source') ?? '',
        });
      }
      if (section === 'songs') return slug ? songUrl(artist, slug) : artistSongsUrl(artist);
      if (section === 'venues') return slug ? venueUrl(slug, artist) : artistVenuesUrl(artist);
      return slug ? tourUrl(artist, slug) : artistToursUrl(artist);
    }
    default:
      return null;
  }
}
