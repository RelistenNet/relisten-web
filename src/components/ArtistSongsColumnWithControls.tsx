'use client';

import { useMemo, useState } from 'react';
import { Song } from '@/types';
import { simplePluralize } from '@/lib/utils';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';

type ArtistSongsColumnWithControlsProps = {
  artistSlug?: string;
  songs: Song[];
};

const ArtistSongsColumnWithControls = ({
  artistSlug,
  songs,
}: ArtistSongsColumnWithControlsProps) => {
  const [sortAlpha, setSortAlpha] = useState(false);

  const toggles = [
    {
      type: 'sort' as const,
      isActive: sortAlpha,
      onToggle: () => setSortAlpha((v) => !v),
      title: sortAlpha ? 'Most Played' : 'A-Z',
    },
  ];

  const sortedSongs = useMemo(() => {
    const sorted = [...songs];
    if (sortAlpha) {
      sorted.sort((a, b) => (a.sortName || a.name || '').localeCompare(b.sortName || b.name || ''));
    } else {
      sorted.sort((a, b) => (b.shows_played_at ?? 0) - (a.shows_played_at ?? 0));
    }
    return sorted;
  }, [songs, sortAlpha]);

  return (
    <ColumnWithToggleControls
      heading="Songs"
      toggles={toggles}
      filteredCount={sortedSongs.length}
      totalCount={songs.length}
    >
      {sortedSongs.length === 0 && (
        <div className="py-2 text-center text-sm text-gray-700">No songs found.</div>
      )}
      {artistSlug &&
        sortedSongs.map((song) => (
          <div key={song.id}>
            <Row href={slugSearchParams.buildUrl(`/${artistSlug}/songs`, { slug: song.slug || String(song.id) })}>
              <div>
                <div>{song.name}</div>
              </div>
              <div className="text-xxs text-foreground-muted min-w-[20%] text-right">
                {song.shows_played_at != null && (
                  <div>{simplePluralize('time', song.shows_played_at)} played</div>
                )}
              </div>
            </Row>
          </div>
        ))}
    </ColumnWithToggleControls>
  );
};

export default ArtistSongsColumnWithControls;
