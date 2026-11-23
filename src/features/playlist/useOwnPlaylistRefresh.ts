'use client';

import { usePathname, useRouter } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';

/**
 * After the creator changes their playlist (publish, archive), show it again:
 * refreshed in place on its own route (/playlists/{id}, or its editor), and on
 * its share-code route, moved to its own. Unpublished or archived, the share
 * code no longer resolves, and refreshing there would land on a 404.
 */
export function useOwnPlaylistRefresh(playlistId: string): () => void {
  const router = useRouter();
  const pathname = usePathname();
  return () => {
    const own = href('/playlists/[playlist]', { playlist: playlistId });
    if (pathname === own || pathname.startsWith(`${own}/`)) router.refresh();
    else router.replace(own);
  };
}
