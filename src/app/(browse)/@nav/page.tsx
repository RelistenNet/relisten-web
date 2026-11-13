import type { PageOptions } from '@timber-js/app/server';
import NavBar from '@/shell/NavBar';

// The browse root (/) is about the default artist. Re-rendered only when the
// user agent changes.
export const pageOptions = {
  lifetime: 'document',
  key: { headers: ['user-agent'] },
} satisfies PageOptions;

export default function BrowseRootNav() {
  return <NavBar defaultToArtist artistSlug={null} />;
}
