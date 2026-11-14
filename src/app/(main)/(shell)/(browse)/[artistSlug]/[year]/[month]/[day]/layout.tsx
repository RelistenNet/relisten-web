import { findArtistBySlug } from '@/data/artists';
import BrowseColumn from '@/features/browse/BrowseColumn';
import { loadShow } from '@/features/browse/load';
import TapesColumn from '@/ui/shows/TapesColumn';
import TrackList from '@/player/PlayingTrackList';
import { songsProjection, tapesProjection } from '@/lib/showProjection';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { ReactNode } from 'react';
import { SEGMENT_PATH } from './$segment';

// The show's songs and tapes columns, keyed by default on the date. Switching
// tapes (`?source=`) is picked client-side, and picking a song is a deeper
// segment, so both skip this layout without rendering it.
export default async function ShowLayout({ children }: { children: ReactNode }) {
  const { artistSlug, year, month, day } = getSegmentParams(SEGMENT_PATH);
  const [show, artist] = await Promise.all([
    loadShow(artistSlug, createShowDate(year, month, day)),
    findArtistBySlug(artistSlug),
  ]);
  return (
    <>
      <BrowseColumn>
        {show && (
          <TrackList
            artistSlug={artistSlug}
            artistName={artist?.name}
            year={year}
            month={month}
            day={day}
            show={songsProjection(show)}
          />
        )}
      </BrowseColumn>
      <BrowseColumn>
        {show && (
          <TapesColumn
            artistSlug={artistSlug}
            year={year}
            month={month}
            day={day}
            show={tapesProjection(show)}
          />
        )}
      </BrowseColumn>
      {children}
    </>
  );
}
