import { href } from '@timber-js/app/routes';

/**
 * The site's own pages, about no artist. `explore` are the listening pages, at
 * the right end of the artist bar at xl; `more` are about the project, in the
 * Site menu. Below xl the Site menu holds them all.
 */
export const siteSections = [
  { label: 'Playlists', href: href('/playlists'), group: 'explore' },
  { label: 'Today in History', href: href('/today'), group: 'explore' },
  { label: 'Live', href: href('/live'), group: 'explore' },
  { label: 'Venues', href: href('/venues'), group: 'explore' },
  { label: 'Blog', href: href('/blog'), group: 'more' },
  { label: 'Chat', href: href('/chat'), group: 'more' },
  { label: 'Apps', href: href('/app'), group: 'more' },
  { label: 'About', href: href('/about'), group: 'more' },
] as const;

/** The account link: "Sign In" until there is a session. */
export const accountSection = (signedIn: boolean) => ({
  label: signedIn ? 'My Account' : 'Sign In',
  href: href('/account'),
});
