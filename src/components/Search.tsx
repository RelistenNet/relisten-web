'use client';

import { useState } from 'react';
import useDebouncedEffect from '../lib/useDebouncedEffect';
import { API_DOMAIN } from '../lib/constants';
import { SearchResuts } from '../types';
import Column from './Column';
import Row from './Row';

async function fetchResults(query) {
  const data: SearchResuts = await fetch(`${API_DOMAIN}/api/v2/search?q=${query}`, {
    cache: 'no-cache', // seconds
  }).then((res) => res.json());

  return data;
}

const Search = () => {
  const [data, setData] = useState<SearchResuts | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('artists');
  const [searchValue, setSearchValue] = useState<string>('');

  useDebouncedEffect(
    () => {
      // TODO: sanitize, trim ...
      if (searchValue) {
        fetchResults(searchValue).then(setData);
      } else {
        setData(null);
      }
    },
    200,
    [searchValue]
  );

  return (
    <div className="w-screen max-w-screen-md">
      <div className="search-bar mb-2 flex items-center p-2">
        <i className="fa fa-search px-2" />
        <input
          className="grow"
          type="text"
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <button onClick={() => setSearchValue('')} aria-label="clear search" className="flex">
          <i className="fa fa-times px-2" />
        </button>
      </div>
      <ul className="search-filters pb-4">
        <li>
          <button
            onClick={() => setActiveFilter('artists')}
            className={activeFilter === 'artists' ? 'search-filters-button--active' : ''}
          >
            Artists
          </button>
        </li>
        <li>
          <button
            onClick={() => setActiveFilter('songs')}
            className={activeFilter === 'songs' ? 'search-filters-button--active' : ''}
          >
            Songs
          </button>
        </li>
      </ul>
      <Column loading={!data}>
        {activeFilter === 'artists' &&
          data?.Artists?.map(({ name, uuid, slug, show_count, source_count }) => {
            return (
              <Row key={uuid} href={`/${slug}`}>
                <div>
                  <div>{name}</div>
                </div>
                <div className="min-w-[20%] text-right text-xs text-[#979797]">
                  <div>ARTIST</div>
                </div>
              </Row>
            );
          })}
        {activeFilter === 'songs' &&
          data?.Songs?.map(({ name, uuid, slim_artist }) => (
            <Row
              key={uuid}
              // TODO: more data needed for song link
              href={slim_artist ? `/${slim_artist.slug}` : undefined}
            >
              <div>
                <div>{name}</div>
                <div className="text-xxs text-gray-400">{slim_artist?.name}</div>
              </div>
              <div className="min-w-[20%] text-right text-xxs text-gray-400">SONG</div>
            </Row>
          ))}
      </Column>
    </div>
  );
};

export default Search;
