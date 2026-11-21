'use server';

import { revalidateTag } from '@timber-js/app/server';
import { z } from 'zod/v4';
import { publicPlaylistTag } from '@/data/playlists';

// The public page caches a playlist for up to a minute (src/data/playlists.ts).
// After publishing or unpublishing, the browser asks for it to be read again at
// once. It only clears a cache entry, so it needs no sign-in: the next read
// still goes to the User Service, which decides what's public.

const PublicCode = z.string().regex(/^[0-9a-f]{32}$/);

export async function refreshPublicPlaylist(code: unknown): Promise<void> {
  const parsed = PublicCode.safeParse(code);
  if (parsed.success) await revalidateTag(publicPlaylistTag(parsed.data));
}
