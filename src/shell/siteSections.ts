import { href } from '@timber-js/app/routes';

/**
 * The site's own pages, about no artist. `primary` are the listening pages, inline
 * in the nav bar at xl; `more` are about the project, in the More menu. Below xl
 * the menu holds both.
 */
export const siteSections = [
  { label: 'Today', href: href('/today'), group: 'primary' },
  { label: 'Live', href: href('/recently-played'), group: 'primary' },
  { label: 'Venues', href: href('/venues'), group: 'primary' },
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
