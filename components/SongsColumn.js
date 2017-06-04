import Link from 'next/link'
import { connect } from 'react-redux'

import { createShowDate, splitShowDate, durationToHHMMSS, removeLeadingZero } from '../lib/utils';

import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';

const SongsColumn = ({ source, loading, artistSlug, songSlug, activePlaybackSourceId }) => {
  const { year, month, day } = source ? splitShowDate(source.display_date) : {}

  return (
    <Column heading={source ? `${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(2)}` : "Songs"} loading={loading} loadingAmount={12}>
      <style jsx>{`
        .column {
          display: flex;
          flex: 1;
        }
      `}</style>
      {source && source.sets.map((set, setIdx) =>
        set.tracks.map((track, trackIdx) =>
          <div key={track.id}>
            {trackIdx === 0 && source.sets.length > 1 && <RowHeader>{set.name || `Set ${setIdx + 1}`}</RowHeader>}
            <Row key={track.id} active={track.slug === songSlug && source.id === activePlaybackSourceId} href={`/${artistSlug}/${year}/${month}/${day}/${track.slug}?source=${source.id}`}>
              <div>
                <div>{track.title}</div>
                {track.duration && <div className="subtext">{durationToHHMMSS(track.duration)}</div>}
              </div>
              <div></div>
            </Row>
          </div>
        )
       )}
      {source && <RowHeader>FIN</RowHeader>}
      {source && source.links &&
        source.links.map(link =>
          <a href={link.url} target="_blank" key={link.id}>
            <Row>
              {link.label}
            </Row>
          </a>
        )
      }
    </Column>
  )
}

const mapStateToProps = ({ tapes, app, playback }) => {
  const activeSourceId = parseInt(app.source, 10);
  const activePlaybackSourceId = parseInt(playback.source, 10);
  const showDate = createShowDate(app.year, app.month, app.day)
  const showTapes = tapes[app.artistSlug] && tapes[app.artistSlug][showDate] ? tapes[app.artistSlug][showDate] : null
  let source;

  if (!showTapes) return {}

  if (showTapes.data && showTapes.data.sources && showTapes.data.sources.length) {
    const { sources } = showTapes.data;

    source = sources.find(source => source.id === activeSourceId) || sources[0]
  }

  return {
    source,
    loading: showTapes.meta.loading,
    artistSlug: app.artistSlug,
    songSlug: playback.songSlug,
    activePlaybackSourceId
  }
}

export default connect(mapStateToProps)(SongsColumn)
