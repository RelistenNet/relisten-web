import RelistenAPI from '@/lib/RelistenAPI';
import { isPrimaryArtist, toArtistRow, type ArtistRow } from '@/lib/artistRows';
import type { Artist } from '@/types';
import ArtistsSelectionTab from './ArtistsSelectionTab';

type SplitRows = { primary: ArtistRow[]; archive: ArtistRow[] };

// The all-artists list is cached, so the same array comes back until it
// refreshes; build the rows once per list rather than on every request.
const rowsByList = new WeakMap<Artist[], SplitRows>();

function splitRows(artists: Artist[]): SplitRows {
  let rows = rowsByList.get(artists);
  if (!rows) {
    rows = { primary: [], archive: [] };
    for (const artist of artists) {
      (isPrimaryArtist(artist) ? rows.primary : rows.archive).push(toArtistRow(artist));
    }
    rowsByList.set(artists, rows);
  }
  return rows;
}

const ArtistsColumn = async () => {
  const { primary, archive } = splitRows(await RelistenAPI.fetchAllArtists());

  // Primary artists ship with the shell; the much longer archive list streams
  // in after it, so it never holds up the first bytes of the page.
  return <ArtistsSelectionTab primary={primary} archive={Promise.resolve(archive)} />;
};

export default ArtistsColumn;
