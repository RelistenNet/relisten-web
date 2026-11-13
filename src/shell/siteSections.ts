import { href } from '@timber-js/app/routes';

/**
 * The site's own pages, about no artist: the nav bar's links, the menu's rows
 * and the site pages' tabs.
 */
export const siteSections = [
  { label: 'Today', href: href('/today') },
  { label: 'Live', href: href('/recently-played') },
  { label: 'Venues', href: href('/venues') },
  { label: 'Chat', href: href('/chat') },
  { label: 'Apps', href: href('/app') },
  { label: 'Blog', href: href('/blog') },
  { label: 'About', href: href('/about') },
] as const;
