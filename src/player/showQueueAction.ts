'use server';

import { getArtistDirectory } from '@/data/artists';
import { showById } from '@/data/shows';
import { showContext } from './queue/items';
import type { QueueContext } from './queue/model';

/**
 * A show's tracks as a queue context, for a shows table's row buttons (the
 * rows carry no tracks). Plays the tape the show page opens on: the first
 * in display order. Null for an unknown show or one with nothing playable.
 */
export async function loadShowQueue(showId: unknown): Promise<QueueContext | null> {
  if (typeof showId !== 'string' || !/^[\w-]{1,64}$/.test(showId)) return null;
  const [show, directory] = await Promise.all([
    showById.get(showId).catch(() => null),
    getArtistDirectory(),
  ]);
  const source = show?.sources[0];
  const artist = show && directory.byId.get(show.artistId);
  if (!show || !source || !artist) return null;
  const ctx = showContext({ show, source, artistSlug: artist.slug, artistName: artist.name });
  return ctx.items.length ? ctx : null;
}
