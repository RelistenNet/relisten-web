import { connect } from 'react-redux'

import { splitShowDate } from '../lib/utils'

import Column from './Column'
import Row from './Row'

const ShowsColumn = ({ artistShows, artistSlug }) => (
  <Column heading="Shows">
    <style jsx>{`
      .column {
        display: flex;
        flex: 1;
      }
    `}</style>
    {artistShows.meta && artistShows.meta.loading && 'Loading...'}
    {artistShows.data && artistShows.data.shows && artistShows.data.shows.map(show => {
      const { year, month, day } = splitShowDate(show.display_date)

      return (
        <Row key={show.id} href={`/${artistSlug}/${year}/${month}/${day}`}>
          {show.display_date}
        </Row>
      )
    })}
  </Column>
)

const mapStateToProps = ({ shows, app }) => {
  const artistShows = shows[app.artistSlug] && shows[app.artistSlug][app.year] ? shows[app.artistSlug][app.year] : {}

  return {
    artistShows,
    artistSlug: app.artistSlug
  }
}

export default connect(mapStateToProps)(ShowsColumn)
