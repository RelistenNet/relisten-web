'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Song } from '@/types';
import Count from './Count';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useFilterState } from '@/hooks/useFilterState';

type ArtistSongsColumnWithControlsProps = {
  artistSlug?: string;
  songs: Song[];
  subHeader?: ReactNode;
};

const ArtistSongsColumnWithControls = ({
  artistSlug,
  songs,
  subHeader,
}: ArtistSongsColumnWithControlsProps) => {
  const { alphaAsc, sortBy, setSortBy } = useFilterState(`${artistSlug}:songs`, 'alpha')

  const dirIcon = alphaAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const toggles = [
    {
      type: 'sort' as const,
      isActive: sortBy === 'tapes',
      onToggle: () => setSortBy('tapes'),
      label: 'Played',
      title: sortBy === 'tapes' ? 'Most Played' : 'Least Played',
      icon: sortBy === 'tapes' ? dirIcon : undefined
    },
    {
      type: 'sort' as const,
      isActive: sortBy === 'alpha',
      onToggle: () => setSortBy('alpha'),
      title: sortBy === 'alpha' ? 'A-Z' : 'Z-A',
      label: 'A-Z',
      icon: sortBy === 'alpha' ? dirIcon : undefined
    },
  ];

  const sortedSongs = useMemo(() => {
    const sorted = [...songs];
    if (sortBy === 'alpha') {
      sorted.sort((a, b) => (a.sortName || a.name || '').localeCompare(b.sortName || b.name || ''));
    } else {
      sorted.sort((a, b) => (b.shows_played_at ?? 0) - (a.shows_played_at ?? 0));
    }
    if (!alphaAsc) sorted.reverse();
    return sorted;
  }, [songs, sortBy, alphaAsc]);

  return (
    <ColumnWithToggleControls
      heading="Songs"
      toggles={toggles}
      filteredCount={sortedSongs.length}
      totalCount={songs.length}
      subHeader={subHeader}
    >
      {sortedSongs.length === 0 && (
        <div className="py-2 text-center text-sm text-text-muted">No songs found.</div>
      )}
      {artistSlug &&
        sortedSongs.map((song) => (
          <div key={song.id}>
            <Row
              href={slugSearchParams.href(`/${artistSlug}/songs`, {
                slug: song.slug || String(song.id),
              })}
            >
              <div>
                <div>{song.name}</div>
              </div>
              <div className="text-xxs min-w-[20%] text-right">
                {song.shows_played_at != null && (
                  <div>
                    <Count unit="time" value={song.shows_played_at} />{' '}
                    <span className="text-text-muted">played</span>
                  </div>
                )}
              </div>
            </Row>
          </div>
        ))}
    </ColumnWithToggleControls>
  );
};

export default ArtistSongsColumnWithControls;
