import { connect } from 'react-redux'

import { splitShowDate, createShowDate, removeLeadingZero, durationToHHMMSS, simplePluralize } from '../lib/utils'

import Column from './Column'
import Row from './Row'
import RowHeader from './RowHeader'

const ShowsColumn = ({ artistShows, artistSlug, displayDate }) => {
  const tours = {}

  return (
    <Column heading="Shows" loading={artistShows.meta && artistShows.meta.loading} loadingAmount={12}>
      <style jsx>{`
        .column {
          display: flex;
          flex: 1;
        }
      `}</style>
      {artistShows.data && artistShows.data.shows && artistShows.data.shows.map(show => {
        const { year, month, day } = splitShowDate(show.display_date)
        const { venue, avg_duration, tour } = show;
        let tourName;

        // keep track of which tours we've displayed
        if (tour) {
          if (!tours[tour.id]) tourName = tour.name

          tours[tour.id] = true
        }

        return (
          <div key={show.id}>
            {tourName && <RowHeader>{tourName}</RowHeader>}
            <Row href={`/${artistSlug}/${year}/${month}/${day}`} active={displayDate === show.display_date} height={44}>
              <div>
                <div>{removeLeadingZero(month)}/{day}</div>
                {venue && <div className="subtext"><div>{venue.name}</div><div>{venue.location}</div></div>}
              </div>
              <div>
                <div>{durationToHHMMSS(avg_duration)}</div>
                <div>{simplePluralize('tape', show.source_count)}</div>
              </div>
            </Row>
          </div>
        )
      })}
    </Column>
  );
}

const mapStateToProps = ({ shows, app }) => {
  const artistShows = shows[app.artistSlug] && shows[app.artistSlug][app.year] ? shows[app.artistSlug][app.year] : {}

  return {
    artistShows,
    artistSlug: app.artistSlug,
    displayDate: createShowDate(app.year, app.month, app.day)
  }
}

export default connect(mapStateToProps)(ShowsColumn)
