import Link from 'next/link'
import { connect } from 'react-redux'

import { createShowDate, splitShowDate } from '../lib/utils';

import Column from './Column';
import Row from './Row';

const SongsColumn = ({ source, artistSlug }) => {
  const { year, month, day } = source ? splitShowDate(source.display_date) : {}

  return (
    <Column heading="Songs">
      <style jsx>{`
        .column {
          display: flex;
          flex: 1;
        }
      `}</style>
      {source && source.sets.map(set =>
        set.tracks.map(track =>
          <Row key={track.id} href={`/${artistSlug}/${year}/${month}/${day}/${track.slug}?source=${source.id}`}>
            {track.title}
          </Row>
        )
       )}
    </Column>
  )
}

const mapStateToProps = ({ tapes, app }) => {
  const showDate = createShowDate(app.year, app.month, app.day)
  const showTapes = tapes[app.artistSlug] && tapes[app.artistSlug][showDate] ? tapes[app.artistSlug][showDate] : null

  if (!showTapes) return {}

  const source = showTapes.data && showTapes.data.sources && showTapes.data.sources.length ? showTapes.data.sources[0] : null

  return {
    source,
    artistSlug: app.artistSlug
  }
}

export default connect(mapStateToProps)(SongsColumn)
