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

// shorten date
const formatterFn = (value, unit, suffix) => value + unit.slice(0, 1)

export default ({ app_type_description = '', created_at, track } = {}) => !track || !track.track ? null : (
  <Link href="/" as={createURL(track)}>
    <div className="container">
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

        .date, .content
          font-weight bold

        .listen
          margin-left auto
          align-self center

        .app-info
          display flex
          justify-content space-between

        .time-ago
          opacity 0.7

        .live-track-enter {
          background: #3DCC91;
        }

        .live-track-enter.live-track-enter-active {
          background: transparent;
          transition: background 6500ms ease-in;
        }
      `}</style>
    </div>
  </Link>
)
