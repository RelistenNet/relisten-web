import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TimeAgo from 'react-timeago';

import { splitShowDate } from '../lib/utils';

const createURL = (track) => {
  const { year, month, day } = splitShowDate(track.source.display_date);

  return '/' + [
    track.source.artist.slug,
    year,
    month,
    day,
    track.track.slug,
  ].join('/') + `?source=${track.source.id}`;
};

const getVenueInfo = (track) => {
  if (track.source.artist && track.source.artist.features) {
    if (track.source.artist.features.per_show_venues && track.source.artist.features.per_source_venues) {
      return track.source.show.venue;
    }

    if (track.source.artist.features.per_show_venues) {
      return track.source.show.venue;
    }

    return track.source.venue;
  }
};

const VenueInfo = ({ track }) => {
  const info = getVenueInfo(track);
  return info ? <div>
    <div>{info.name}</div>
    <div>{info.location}</div>
  </div> : null;
};

// shorten date
const formatterFn = (value, unit) => value + unit.slice(0, 1);

export default ({ app_type_description = '', created_at, track, isFirstRender, isLastSeen } = {}) => {
  const [isMounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  return (
    !track || !track.track ? null : (
      <Link href="/" as={createURL(track)}>
        <div className="container" data-is-last-seen={isLastSeen}>
          <div className="info">
            <div className="date">{track.source.display_date}</div>
            <div className="app-info">
              {app_type_description}
              &nbsp;
              <span className="time-ago">
                <TimeAgo
                  date={created_at}
                  formatter={formatterFn}
                />
              </span>
            </div>
          </div>
          <div>
            <div className="content">
              {track.track.title}
            </div>
            <div>
              {track.source.artist.name}
            </div>
            <div className="subtext">
              <VenueInfo track={track} />
            </div>
          </div>

          <div className="listen">Listen</div>

          <style jsx>{`
            .container
              width 100%
              display flex
              flex-direction row
              padding 12px
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

            .app-info
              display flex
              justify-content space-between

            .time-ago
              opacity 0.7
          `}</style>
        </div>
      </Link>
    )
  );
};
