import { findArtistBySlug } from '@/data/artists';
import { loadRandomShow } from '@/features/browse/load';
import BrowseColumn from '@/features/browse/BrowseColumn';
import ShowsColumn from '@/features/browse/ShowsColumn';
import TapesColumn from '@/ui/shows/TapesColumn';
import TrackList from '@/player/PlayingTrackList';
import { songsProjection, tapesProjection } from '@/lib/showProjection';
import { splitShowDate } from '@/lib/utils';

/**
 * The shows, songs and tapes columns for a random show of `artistSlug`, and an
 * empty main column: what an artist's browse root shows before a year is
 * picked. Rendered by a page, so it is 'request' (a new show per load).
 */
export default async function RandomShowColumns({ artistSlug }: { artistSlug: string }) {
  const [show, artist] = await Promise.all([
    loadRandomShow(artistSlug),
    findArtistBySlug(artistSlug),
  ]);
  if (!show) {
    return (
      <>
        <BrowseColumn />
        <BrowseColumn />
        <BrowseColumn />
        <BrowseColumn />
      </>
    );
  }
  const { year, month, day } = splitShowDate(show.date);
  return (
    <>
      <BrowseColumn>
        <ShowsColumn artistSlug={artistSlug} year={year} />
      </BrowseColumn>
      <BrowseColumn>
        <TrackList
          artistSlug={artistSlug}
          artistName={artist?.name}
          year={year}
          month={month}
          day={day}
          show={songsProjection(show)}
        />
      </BrowseColumn>
      <BrowseColumn>
        <TapesColumn
          artistSlug={artistSlug}
          year={year}
          month={month}
          day={day}
          show={tapesProjection(show)}
        />
      </BrowseColumn>
      <BrowseColumn />
    </>
  );
}
