import { SearchParams, SearchResults, SearchResultsType, SongVersions } from '@/types';
import { API_DOMAIN } from '@/lib/constants';
import { SimplePopover } from '@/components/Popover';
import SearchBar from '@/components/search/SearchBar';
import SearchFilterPill from '@/components/search/SearchFilterPill';
import SearchResultsCpt from '@/components/search/SearchResults';
import SearchSortByMenu from '@/components/search/SearchSortByMenu';

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  let data: SearchResults | null = null;
  let resultsType: SearchResultsType = searchParams.resultsType || 'all';
  let versionsData: SongVersions | null = null;

  if (searchParams.q) {
    const response = await fetch(`${API_DOMAIN}/api/v2/search?q=${searchParams.q}`, {
      cache: 'no-cache', // seconds
    }).then((res) => res.json());

    // API sometimes returns null instead of []
    data = { ...response, Songs: !response.Songs ? [] : response.Songs };
  }

  if (data?.Songs.length && searchParams.songUuid) {
    const song = data.Songs.find(({ uuid }) => uuid === searchParams.songUuid);

    let versions = await fetch(
      `${API_DOMAIN}/api/v3/artists/${song?.slim_artist?.uuid}/songs/${searchParams.songUuid}`,
      { cache: 'no-cache' }
    );

    versions = await versions.json();

    resultsType = 'versions';

    versionsData = {
      ...versions,
      artistName: song?.slim_artist?.name || '',
      artistSlug: song?.slim_artist?.slug || '',
    };
  }

  return (
    <div className="mx-auto w-full max-w-screen-md flex-1">
      <SearchBar resultsType={resultsType} />
      <div className="flex justify-between pb-4">
        {data !== null && resultsType === 'versions' && (
          <div className="font-semibold">
            Showing all versions of “{versionsData?.name}” by {versionsData?.artistName}
          </div>
        )}
        {data !== null && resultsType !== 'versions' && (
          <ul className="search-filters">
            <li>
              <SearchFilterPill
                buttonType="all"
                resultsType={resultsType}
                searchParams={searchParams}
              >
                All {data && `(${data?.Artists?.length + data?.Songs?.length})`}
              </SearchFilterPill>
            </li>
            <li>
              <SearchFilterPill
                buttonType="artists"
                resultsType={resultsType}
                searchParams={searchParams}
              >
                Artists {data && `(${data?.Artists?.length})`}
              </SearchFilterPill>
            </li>
            <li>
              <SearchFilterPill
                buttonType="songs"
                resultsType={resultsType}
                searchParams={searchParams}
              >
                Songs {data && `(${data?.Songs?.length})`}
              </SearchFilterPill>
            </li>
          </ul>
        )}
        {resultsType === 'versions' && (
          <SimplePopover
            content={<SearchSortByMenu resultsType={resultsType} searchParams={searchParams} />}
            position="bottom-end"
          >
            <button>Sort by ⏷</button>
          </SimplePopover>
        )}
      </div>
      <SearchResultsCpt
        data={data}
        resultsType={resultsType}
        searchParams={searchParams}
        versionsData={versionsData}
      />
    </div>
  );
}

export const metadata = {
  title: 'Search',
};
