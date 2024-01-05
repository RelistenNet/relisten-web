'use client';

import { useCallback, useEffect, useState } from 'react';
import useDebouncedEffect from '../lib/useDebouncedEffect';
import { API_DOMAIN } from '../lib/constants';
import SearchResults from './SearchResults';
import { Artist, SearchResuts, SearchResultsType, SongVersions } from '../types';
import Column from './Column';
import { SimplePopover } from './Popover';
import Row from './Row';

async function fetchSearchResults(query: string) {
  const data: SearchResuts = await fetch(`${API_DOMAIN}/api/v2/search?q=${query}`, {
    cache: 'no-cache', // seconds
  }).then((res) => res.json());

  return data;
}

const SortByMenu = ({
  resultsType,
  setSortBy,
}: {
  resultsType: SearchResultsType;
  setSortBy: (string) => void;
}) => {
  if (resultsType === 'all') {
    return null;
  }

  if (resultsType === 'artists') {
    return null;
  }

  if (resultsType === 'songs') {
    return null;
  }

  if (resultsType === 'versions') {
    return (
      <Column>
        <button onClick={() => setSortBy('DATE_ASC')}>
          <Row>Date (Ascending)</Row>
        </button>
        <button onClick={() => setSortBy('DATE_DESC')}>
          <Row>Date (Descending)</Row>
        </button>
      </Column>
    );
  }
};

const Search = () => {
  const [data, setData] = useState<SearchResuts | null>(null);
  const [versionsData, setVersionsData] = useState<SongVersions | null>(null);
  const [resultsType, setResultsType] = useState<SearchResultsType>('all');
  const [searchValue, setSearchValue] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('DATE_ASC');

  useDebouncedEffect(
    () => {
      // TODO: sanitize, trim ...
      if (searchValue) {
        fetchSearchResults(searchValue).then((r) => {
          // API sometimes returns null instead of []
          const songs = !r.Songs ? [] : r.Songs;
          setData({ ...r, Songs: songs });
        });
      } else {
        setData(null);
      }
    },
    200,
    [searchValue]
  );

  const clearSearch = useCallback(() => {
    setSearchValue('');
    setData(null);
    setResultsType('all');
    setVersionsData(null);
    setSortBy('');
  }, []);

  const getSources = useCallback(
    (slim_artist: Artist | undefined, songUuid: string | undefined) => {
      if (!songUuid || !slim_artist || !slim_artist.slug) {
        // TODO: handle error
        return;
      }

      fetch(`${API_DOMAIN}/api/v3/artists/${slim_artist.uuid}/songs/${songUuid}`, {
        cache: 'no-cache', // seconds
      }).then((res) => {
        res.json().then((json) => {
          setResultsType('versions');
          setVersionsData({
            ...json,
            artistName: slim_artist.name,
            artistSlug: slim_artist.slug,
          });
        });
      });
    },
    []
  );

  return (
    <div className="w-screen max-w-screen-md">
      {resultsType === 'versions' ? (
        <button
          className="mb-2 h-[42px] font-semibold"
          onClick={clearSearch}
          aria-label="clear search"
        >
          <i className="fa fa-times" /> Clear search
        </button>
      ) : (
        <div className="search-bar mb-2 flex items-center p-2">
          <i className="fa fa-search px-2" />
          <input
            className="grow"
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <button onClick={clearSearch} aria-label="clear search" className="flex">
            <i className="fa fa-times px-2" />
          </button>
        </div>
      )}
      <div className="flex justify-between pb-4">
        {data !== null && resultsType === 'versions' && (
          <div className="font-semibold">
            Showing all versions of “{versionsData?.name}” by {versionsData?.artistName}
          </div>
        )}
        {data !== null && resultsType !== 'versions' && (
          <ul className="search-filters">
            <li>
              <button
                onClick={() => setResultsType('all')}
                className={resultsType === 'all' ? 'search-filters-button--active' : ''}
              >
                All {data && `(${data?.Artists?.length + data?.Songs?.length})`}
              </button>
            </li>
            <li>
              <button
                onClick={() => setResultsType('artists')}
                className={resultsType === 'artists' ? 'search-filters-button--active' : ''}
              >
                Artists {data && `(${data?.Artists?.length})`}
              </button>
            </li>
            <li>
              <button
                onClick={() => setResultsType('songs')}
                className={resultsType === 'songs' ? 'search-filters-button--active' : ''}
              >
                Songs {data && `(${data?.Songs?.length})`}
              </button>
            </li>
          </ul>
        )}
        {resultsType === 'versions' && (
          <SimplePopover content={<SortByMenu resultsType={resultsType} setSortBy={setSortBy} />}>
            <button>Sort by ⏷</button>
          </SimplePopover>
        )}
      </div>
      <SearchResults
        data={data}
        getSources={getSources}
        sortBy={sortBy}
        resultsType={resultsType}
        versionsData={versionsData}
      />
    </div>
  );
};

export default Search;
