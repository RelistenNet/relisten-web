import { connect } from 'react-redux';

import {
  splitShowDate,
  createShowDate,
  removeLeadingZero,
  durationToHHMMSS,
  simplePluralize,
} from '../lib/utils';
import sortActiveBands from '../lib/sortActiveBands';

import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';
import { ArtistShows, Meta, Show } from '../types';
import Flex from './Flex';

type ShowsColumnProps = {
  artistShows: {
    data: ArtistShows;
    meta: Meta;
  };
  artistSlug: string;
  year: string;
  displayDate: string;
};

const ShowsColumn = ({
  artistShows,
  artistSlug,
  year,
  displayDate,
}: ShowsColumnProps): JSX.Element => {
  const tours = {};

  return (
    <Column
      heading={year ? year : 'Shows'}
      loading={displayDate && !artistShows ? true : artistShows.meta && artistShows.meta.loading}
      loadingAmount={12}
    >
      {artistShows.data &&
        artistShows.data.shows &&
        sortActiveBands(artistSlug, artistShows.data.shows).map((show: Show) => {
          const { year, month, day } = splitShowDate(show.display_date);
          const { venue, avg_duration, tour } = show;
          let tourName: string;

          // keep track of which tours we've displayed
          if (tour) {
            if (!tours[tour.id]) tourName = tour.name;

            tours[tour.id] = true;
          }

          return (
            <div key={show.id}>
              {tourName && (
                <RowHeader>{tourName === 'Not Part of a Tour' ? '' : tourName}</RowHeader>
              )}
              <Row
                href={`/${artistSlug}/${year}/${month}/${day}`}
                active={displayDate === show.display_date}
                height={48}
              >
                <div className={displayDate === show.display_date ? 'pl-2' : ''}>
                  <Flex>
                    {removeLeadingZero(month)}/{day}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="text-[0.7em] text-[#979797]">
                      <div>{venue.name}</div>
                      <div>{venue.location}</div>
                    </div>
                  )}
                </div>
                <div className="min-w-[20%] text-right text-[0.7em] text-[#979797]">
                  <div>{durationToHHMMSS(avg_duration)}</div>
                  <div>{simplePluralize('tape', show.source_count)}</div>
                </div>
              </Row>
            </div>
          );
        })}
    </Column>
  );
};

const mapStateToProps = ({ shows, app }): ShowsColumnProps => {
  const artistShows =
    shows[app.artistSlug] && shows[app.artistSlug][app.year] ? shows[app.artistSlug][app.year] : {};

  return {
    artistShows,
    year: app.year,
    artistSlug: app.artistSlug,
    displayDate: createShowDate(app.year, app.month, app.day),
  };
};

export default connect(mapStateToProps)(ShowsColumn);
