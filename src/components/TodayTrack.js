import React from 'react';
import Link from 'next/link';

import { splitShowDate } from '../lib/utils';

const createURL = (obj) => {
  const { year, month, day } = splitShowDate(obj.display_date);

  return '/' + [obj.artist.slug, year, month, day].join('/');
};

export default ({ day = {} }) =>
  !day ? null : (
    <Link href="/" as={createURL(day)}>
      <div className="container">
        <div className="info">
          <div className="date">{day.display_date}</div>
        </div>

        <div>
          <div>{day.venue ? [day.venue.name, day.venue.location].join(' ') : ''}</div>
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

        .info
          margin-right 12px

        .date
          font-weight bold

        .listen
          margin-left auto
          align-self center
      `}</style>
      </div>
    </Link>
  );
