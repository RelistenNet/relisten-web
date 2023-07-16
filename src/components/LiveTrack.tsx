import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TimeAgo from 'react-timeago';

import { splitShowDate } from '../lib/utils';
import { TrackSource, Track, Venue } from '../types';

const createURL = (track: { track: Track; source: TrackSource }): string => {
  const { year, month, day } = splitShowDate(track.source.display_date);

  return (
    '/' +
    [track.source.artist.slug, year, month, day, track.track.slug].join('/') +
    `?source=${track.source.id}`
  );
};

const getVenueInfo = (track: TrackSource): Venue => {
  if (track.artist && track.artist.features) {
    if (track.artist.features.per_show_venues && track.artist.features.per_source_venues) {
      return track.show.venue;
    }

    if (track.artist.features.per_show_venues) {
      return track.show.venue;
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

const VenueInfo = ({ track, app_type_description, created_at }: VenueInfoProps): JSX.Element => {
  const info = getVenueInfo(track.source);
  return info ? (
    <div>
      <div>
        {info.name} &middot; {info.location}
      </div>
      <div>
        {track.source.display_date} &middot;{' '}
        <span className="time-ago">
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

export default ({
  app_type_description = '',
  created_at,
  track,
  isFirstRender,
  isLastSeen,
}: LiveTrackProps): JSX.Element => {
  const [isMounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  return !track || !track.track ? null : (
    <Link href="/" as={createURL(track)} legacyBehavior>
      <div className="container" data-is-last-seen={isLastSeen}>
        <div>
          <div className="content">{track.track.title}</div>
          <div>{track.source.artist.name}</div>

          <div className="subtext">
            <VenueInfo
              track={track}
              app_type_description={app_type_description}
              created_at={created_at}
            />
          </div>
        </div>

        <div className="listen">
          <span>Relisten</span>
        </div>

        <style jsx>{`
            .container
              width 100%
              display flex
              flex-direction row
              padding 12px 0
              border-bottom 1px solid #eee
              cursor pointer
              opacity ${isMounted || isFirstRender ? 1 : 0}
              transition opacity 1000ms ease-in-out

              &[data-is-last-seen="true"]
                border-bottom 1px solid green

            .info
              margin-right 12px

            .date, .content
              font-weight bold

            .subtext
              color: #979797;
              font-size: 0.7em;

            .listen
              margin-left auto
              align-self center
              display flex
              flex-direction column

            .app-info
              display flex
              justify-content space-between

            .time-ago
              opacity 0.7
              font-size 0.7em
              text-align right
          `}</style>
      </div>
    </Link>
  );
};
