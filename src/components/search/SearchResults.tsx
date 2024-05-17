import {
  Artist,
  SearchParams,
  SearchResults as TSearchResults,
  SearchResultsType,
  SongVersions,
  Song,
} from '../../types';
import Link from 'next/link';
import { sortByKey } from '@/lib/utils';
import Column from '../Column';
import Row from '../Row';

// "1984-12-01T00:00:00Z" -> "1984/12/01"
function dateStringToPathSegment(inputDateStr) {
  const originalDate = new Date(inputDateStr);
  const yyyy = originalDate.getUTCFullYear();
  const mm = String(originalDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(originalDate.getUTCDate()).padStart(2, '0');

  return `${yyyy}/${mm}/${dd}`;
}

export default function SearchResults({
  data,
  resultsType,
  searchParams,
  versionsData,
}: {
  data: TSearchResults | null;
  resultsType: SearchResultsType;
  searchParams: SearchParams;
  versionsData: SongVersions | null;
}) {
  const writableParams = new URLSearchParams(searchParams);
  let sortedData: TSearchResults | null = null;
  let sortedVersions: SongVersions | null = null;

  if (data) {
    sortedData = {
      ...data,
      Artists: sortByKey('sort_name', data.Artists) as Artist[],
      Songs: sortByKey('shows_played_at', data.Songs) as Song[], // sortByKey('sortName', data.Songs)
    };
  }

  if (versionsData) {
    sortedVersions = {
      ...versionsData,
      shows: [...versionsData.shows].sort((a, b) => {
        if (a.date === undefined || b.date === undefined) {
          return 0;
        }

        if (new Date(a.date).getTime() > new Date(b.date).getTime()) {
          return searchParams.sortBy === 'DATE_ASC' ? 1 : -1;
        }

        if (new Date(a.date).getTime() < new Date(b.date).getTime()) {
          return searchParams.sortBy === 'DATE_ASC' ? -1 : 1;
        }

        return 0;
      }),
    };
  }

  function getHref(slim_artist: Artist | undefined, songUuid: string | undefined) {
    if (!slim_artist || !slim_artist.uuid || !songUuid) {
      // TODO: handle error
      return 'search';
    }

    writableParams.set('artistUuid', slim_artist.uuid);
    writableParams.set('songUuid', songUuid);

    return `search?${writableParams.toString()}`;
  }

  if (sortedData === null) {
    return (
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <div>// TODO: There is no search query, so put the featured artists list here</div>
    );
  }

  if (resultsType === 'artists' && sortedData?.Artists.length) {
    return (
      <Column>
        {sortedData?.Artists.map(({ name, uuid, slug }) => (
          <Row key={uuid} href={`/${slug}`}>
            <div>
              <div>{name}</div>
            </div>
            <div className="min-w-[20%] text-right text-xs text-[#979797]">
              <div>ARTIST</div>
            </div>
          </Row>
        ))}
      </Column>
    );
  }

  if (resultsType === 'songs' && sortedData?.Songs.length) {
    return (
      <Column>
        {sortByKey('shows_played_at', sortedData?.Songs).map(
          ({ name, uuid, slim_artist }: Song) => (
            <Link key={uuid} className="d-flex" href={getHref(slim_artist, uuid)} replace={true}>
              <Row>
                <div className="text-left">
                  <div>{name}</div>
                  <div className="text-xxs text-gray-400">{slim_artist?.name}</div>
                </div>
                <div className="min-w-[20%] text-right text-xxs text-gray-400">SONG</div>
              </Row>
            </Link>
          )
        )}
      </Column>
    );
  }

  if (resultsType === 'all' && (sortedData?.Artists.length || sortedData?.Songs.length)) {
    return (
      <Column>
        {sortedData?.Artists.map(({ name, uuid, slug }) => (
          <Row key={uuid} href={`/${slug}`}>
            <div>
              <div>{name}</div>
            </div>
            <div className="min-w-[20%] text-right text-xs text-[#979797]">
              <div>ARTIST</div>
            </div>
          </Row>
        ))}
        {sortByKey('shows_played_at', sortedData?.Songs).map(
          ({ name, uuid, slim_artist }: Song) => (
            <Link key={uuid} className="d-flex" href={getHref(slim_artist, uuid)} replace={true}>
              <Row>
                <div className="text-left">
                  <div>{name}</div>
                  <div className="text-xxs text-gray-400">{slim_artist?.name}</div>
                </div>
                <div className="min-w-[20%] text-right text-xxs text-gray-400">SONG</div>
              </Row>
            </Link>
          )
        )}
      </Column>
    );
  }

  if (resultsType === 'versions' && sortedVersions) {
    return sortedVersions?.shows?.map(({ date, display_date, venue, uuid }) => {
      // https://relisten.net/grateful-dead/1994/12/15/me-and-my-uncle?source=346445
      return (
        <Row
          key={uuid}
          href={`/${sortedVersions?.artistSlug}/${dateStringToPathSegment(
            date
          )}/${sortedVersions?.slug}`}
        >
          <div>
            <div>{sortedVersions?.name}</div>
            <div className="text-xxs text-[#979797]">
              <div>
                {venue?.sortName} · {venue?.location}
              </div>
              <div>{display_date}</div>
            </div>
          </div>
          {/* // TODO: where is the duration? */}
          <div className="ml-auto">12:00</div>
        </Row>
      );
    });
  }

  return <div>No results</div>;
}
