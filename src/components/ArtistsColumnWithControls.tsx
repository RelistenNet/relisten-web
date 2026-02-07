'use client';

import { useMemo } from 'react';
import { groupBy, simplePluralize } from '../lib/utils';
import { Artist } from '../types';
import { useFilterState } from '@/hooks/useFilterState';
import { FilterState } from '@/lib/filterCookies';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import PopularityBadge from './PopularityBadge';
import Row from './Row';
import RowHeader from './RowHeader';

const byObject = {
  phish: 'Phish.in',
};

type ArtistsColumnWithControlsProps = {
  artists: Artist[];
  initialFilters?: FilterState;
};

const ArtistsColumnWithControls = ({ artists, initialFilters }: ArtistsColumnWithControlsProps) => {
  const { alphaAsc, toggleFilter, clearFilters } = useFilterState(initialFilters, 'root');

  const toggles = [
    {
      type: 'sort' as const,
      isActive: alphaAsc, // Show as active when Z-A (ascending)
      onToggle: () => toggleFilter('alpha'),
      title: alphaAsc ? 'Z-A' : 'A-Z',
    },
  ];

  const processedArtists = useMemo(() => {
    const grouped = groupBy(artists, 'featured');
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
  }, [artists, alphaAsc]);

  const totalArtistCount = artists.length;
  const filteredArtistCount = processedArtists.reduce(
    (acc, [, groupArtists]) => acc + groupArtists.length,
    0
  );
  console.log(artists);
  return (
    <ColumnWithToggleControls
      heading="Bands"
      toggles={toggles}
      filteredCount={filteredArtistCount}
      totalCount={totalArtistCount}
      onClearFilters={clearFilters}
    >
      {processedArtists.map(([type, groupArtists]) => [
        <RowHeader key={`header-${type}`}>{type === '1' ? 'Featured' : 'Bands'}</RowHeader>,
        ...groupArtists.map((artist: Artist, idx: number) => (
          <Row
            key={[idx, artist.uuid].join(':')}
            href={`/${artist.slug}`}
            activeSegments={{ artistSlug: artist.slug }}
          >
            <div>
              <div>{artist.name}</div>
              <PopularityBadge popularity={artist.popularity} />
              {byObject[String(artist.slug)] && (
                <div className="text-foreground-muted text-xxs">
                  Powered by {byObject[String(artist.slug)]}
                </div>
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
