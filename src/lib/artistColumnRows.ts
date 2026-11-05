import 'server-only';

import RelistenAPI from '@/lib/RelistenAPI';
import { isPrimaryArtist, toArtistRow, type ArtistRow } from '@/lib/artistRows';
import type { Artist } from '@/types';

type ArtistColumnRows = {
  primary: ArtistRow[];
  /** The archive rows, already serialized: the route sends this string as-is. */
  archiveJson: string;
};

// The all-artists list is cached, so the same array comes back until it
// refreshes. Build the rows (and serialize the ~4k-row archive list) once per
// list rather than on every request.
const rowsByList = new WeakMap<Artist[], ArtistColumnRows>();

export async function getArtistColumnRows(): Promise<ArtistColumnRows> {
  const artists = await RelistenAPI.fetchAllArtists();
  let rows = rowsByList.get(artists);
  if (!rows) {
    const primary: ArtistRow[] = [];
    const archive: ArtistRow[] = [];
    for (const artist of artists) {
      (isPrimaryArtist(artist) ? primary : archive).push(toArtistRow(artist));
    }
    rows = { primary, archiveJson: JSON.stringify(archive) };
    rowsByList.set(artists, rows);
  }
  return rows;
}
