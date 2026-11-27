'use server';

import { revalidateTag } from '@timber-js/app/server';
import { z } from 'zod/v4';
import { getOwnPlaylist, publicPlaylistTag } from '@/data/playlists';
import { isTypeId } from '@/domain/typeid';

// The public page caches a playlist for up to a minute (src/data/playlists.ts).
// After publishing or unpublishing, its owner's browser asks for it to be read
// again at once. Only the owner can: the playlist is looked up with their
// session, and its own share code is the one cleared.

const PlaylistId = z.string().refine((id) => isTypeId(id, 'playlist'));

export async function refreshPublicPlaylist(playlistId: unknown): Promise<void> {
  const parsed = PlaylistId.safeParse(playlistId);
  if (!parsed.success) return;
  const own = await getOwnPlaylist(parsed.data).catch(() => null);
  if (own?.kind === 'found' && own.shareCode) await revalidateTag(publicPlaylistTag(own.shareCode));
}
