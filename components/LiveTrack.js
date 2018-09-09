import Link from 'next/link'
import TimeAgo from 'react-timeago'

import { splitShowDate } from '../lib/utils';

const createURL = (track) => {
  const { year, month, day } = splitShowDate(track.source.display_date);

  return '/' + [
    track.source.artist.slug,
    year,
    month,
    day,
    track.track.slug
  ].join('/') + `?source=${track.source.id}`;
}

export default ({ app_type, played_at, track } = {}) => !track || !track.track ? null : (
  <Link href="/" as={createURL(track)}>
    <div className="container">
      <div className="info">
        <div className="date">{track.source.display_date}</div>
        <div>{app_type}</div>
      </div>

      <div>
        <div>
          {track.track.title}
        </div>
        <div>
          {track.source.artist.name}
          &nbsp;
          <span className="time-ago">
            <TimeAgo date={played_at} />
          </span>
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

        .info
          margin-right 12px

        .date
          font-weight bold

        .listen
          margin-left auto
          align-self center

        .time-ago
          opacity 0.7
      `}</style>
    </div>
  </Link>
)
