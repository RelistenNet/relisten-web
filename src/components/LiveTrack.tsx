import { useState, useEffect } from 'react';
import Link from 'next/link';
import TimeAgo from 'react-timeago';

import { splitShowDate } from '../lib/utils';
import { TrackSource, Track, Venue } from '../types';
import Flex from './Flex';

const createURL = (track: { track: Track; source: TrackSource }): string => {
  const { year, month, day } = splitShowDate(track.source.display_date);

  return (
    '/' +
    [track.source.artist?.slug, year, month, day, track.track.slug].join('/') +
    `?source=${track.source.id}`
  );
};

const getVenueInfo = (track: TrackSource): Venue | undefined => {
  if (track.artist && track.artist.features) {
    if (track.artist.features.per_show_venues && track.artist.features.per_source_venues) {
      return track.show?.venue;
    }

    if (track.artist.features.per_show_venues) {
      return track.show?.venue;
    }

    return track.venue;
  }
};

type VenueInfoProps = {
  track: {
    track: Track;
    source: TrackSource;
  };
  app_type_description: string;
  created_at: string;
};

const VenueInfo = ({ track, app_type_description, created_at }: VenueInfoProps) => {
  const info = getVenueInfo(track.source);
  return info ? (
    <div>
      <div>
        {info.name} &middot; {info.location}
      </div>
      <div>
        {track.source.display_date} &middot;{' '}
        <span className="align-right text-[0.7em] opacity-70">
          {app_type_description} &middot; <TimeAgo date={created_at} formatter={formatterFn} />
        </span>
      </div>
    </div>
  ) : null;
};

// shorten date
const formatterFn = (value: number, unit: string) => value + unit.slice(0, 1);

type LiveTrackProps = {
  app_type_description: string;
  created_at: string;
  track: {
    source: TrackSource;
    track: Track;
  };
  isFirstRender: boolean;
  isLastSeen: boolean;
};

// eslint-disable-next-line react/display-name
export default function LiveTrack({
  app_type_description = '',
  created_at,
  track,
  isFirstRender,
  isLastSeen,
}: LiveTrackProps) {
  const [isMounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  if (!track?.track) return null;

  return (
    <Link href={createURL(track)} prefetch={false}>
      <Flex
        className={`w-full cursor-pointer border-b-[1px] border-[#eeeeee] px-3 transition-opacity duration-1000 ease-in-out ${
          isMounted || isFirstRender ? 'opacity-100' : 'opacity-0'
        } ${isLastSeen && 'border-b-green-600'}`}
        data-is-last-seen={isLastSeen}
      >
        <div>
          <div className="content">{track.track.title}</div>
          <div>{track.source.artist?.name}</div>

          <div className="text-[0.7em] text-[#979797]">
            <VenueInfo
              track={track}
              app_type_description={app_type_description}
              created_at={created_at}
            />
          </div>
        </div>

        <Flex column className="ml-auto self-center">
          <span>Relisten</span>
        </Flex>
      </Flex>
    </Link>
  );
}
