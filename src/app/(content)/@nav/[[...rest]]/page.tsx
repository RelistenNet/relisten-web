import type { PageOptions } from '@timber-js/app/server';
import NavBar from '@/shell/NavBar';

// Content pages about no artist (the blog, today, live, …). Re-rendered only
// when the user agent changes.
export const pageOptions = {
  lifetime: 'document',
  key: { segmentParams: [], headers: ['user-agent'] },
} satisfies PageOptions;

export default function ContentNav() {
  return <NavBar artistSlug={null} />;
}
