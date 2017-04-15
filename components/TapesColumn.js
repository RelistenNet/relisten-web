import Link from 'next/link'
import { connect } from 'react-redux'

import { createShowDate, splitShowDate } from '../lib/utils'

import Column from './Column'
import Row from './Row'

const TapesColumn = ({ tapes, artistSlug }) => {
  const sources = tapes.data && tapes.data.sources && tapes.data.sources.length ? tapes.data.sources : null
  const { year, month, day } = sources ? splitShowDate(sources[0].display_date) : {}

  return (
    <Column heading="Sources">
      <style jsx>{`
        .column {
          display: flex;
          flex: 1;
        }
      `}</style>
      {tapes.meta && tapes.meta.loading && 'Loading...'}
      {sources && sources.map((source, idx) =>
        <Row key={source.id} href={`/${artistSlug}/${year}/${month}/${day}?source=${source.id}`}>
          source {idx + 1}
        </Row>
       )}
    </Column>
  )
}

const mapStateToProps = ({ tapes, app }) => {
  const showDate = createShowDate(app.year, app.month, app.day)
  const showTapes = tapes[app.artistSlug] && tapes[app.artistSlug][showDate] ? tapes[app.artistSlug][showDate] : {}

  return {
    tapes: showTapes,
    artistSlug: app.artistSlug
  }
}

export default connect(mapStateToProps)(TapesColumn)
