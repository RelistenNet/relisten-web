'use client';

import { useMemo } from 'react';
import { groupBy, simplePluralize } from '../lib/utils';
import { Artist } from '../types';
import { useFilterState } from '@/hooks/useFilterState';
import { FilterState } from '@/lib/filterCookies';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';
import RowHeader from './RowHeader';
import { useFavoriteState } from '@/hooks/useFavoriteState';

const byObject = {
  phish: 'Phish.in',
};

const artistGroups = {
  0: 'Bands',
  1: 'Featured',
  2: 'Favorites',
};

type ArtistsColumnWithControlsProps = {
  artists: Artist[];
  initialFilters?: FilterState;
  initialFavorites: string[];
};

const ArtistsColumnWithControls = ({
  artists,
  initialFilters,
  initialFavorites,
}: ArtistsColumnWithControlsProps) => {
  const { alphaAsc, toggleFilter, clearFilters } = useFilterState(initialFilters, 'root');
  const { favorites } = useFavoriteState(initialFavorites);

  const toggles = [
    {
      type: 'sort' as const,
      isActive: alphaAsc, // Show as active when Z-A (ascending)
      onToggle: () => toggleFilter('alpha'),
      title: alphaAsc ? 'Z-A' : 'A-Z',
    },
  ];

  const processedArtists = useMemo(() => {
    console.log('processing artists...')
    try {
      const favoritesGroup = artists.filter(
        (artist) => artist.uuid && favorites.includes(artist.uuid)
      );

      const grouped = groupBy(artists, 'featured');
      if (favoritesGroup.length) {
        grouped[2] = favoritesGroup;
      }

      const sortedGroups = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
      return sortedGroups.map(([type, groupArtists]) => {
        const sorted = [...groupArtists];

        // Apply alphabetical sorting (default is desc/A-Z when no filter set)
        if (alphaAsc) {
          // Z-A (ascending)
          sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        } else {
          // Default: A-Z (descending)
          sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return [type, sorted] as [string, Artist[]];
      });
    } catch (error) {
      console.error('Error processing artists:', error);
      return [];
    }
  }, [artists, alphaAsc, favorites]);

  const totalArtistCount = artists.length;
  const filteredArtistCount = processedArtists.reduce(
    (acc, [, groupArtists]) => acc + groupArtists.length,
    0
  );

  return (
    <ColumnWithToggleControls
      heading="Bands"
      toggles={toggles}
      filteredCount={filteredArtistCount}
      totalCount={totalArtistCount}
      onClearFilters={clearFilters}
    >
      {processedArtists.map(([type, groupArtists]) => [
        <RowHeader key={`header-${type}`}>{artistGroups[type]}</RowHeader>,
        ...groupArtists.map((artist: Artist, idx: number) => (
          <Row
            key={[idx, artist.id].join(':')}
            href={`/${artist.slug}`}
            activeSegments={{ artistSlug: artist.slug }}
          >
            <div>
              <div>{artist.name}</div>
              {byObject[String(artist.slug)] && (
                <span className="text-foreground-muted text-xs">
                  Powered by {byObject[String(artist.slug)]}
                </span>
              )}
            </div>
            <div className="text-foreground-muted min-w-[20%] text-right text-xs">
              <div>{simplePluralize('show', artist.show_count)}</div>
              <div>{simplePluralize('tape', artist.source_count)}</div>
            </div>
          </Row>
        )),
      ])}
    </ColumnWithToggleControls>
  );
};

export default ArtistsColumnWithControls;
