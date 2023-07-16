import React from 'react';
import { connect } from 'react-redux';

import { simplePluralize } from '../lib/utils';
import sortActiveBands from '../lib/sortActiveBands';

import Column from './Column';
import Row from './Row';
import { Artist, Meta, Year } from '../types';

type YearsColumnProps = {
  artistYears: {
    data: Year[];
    meta: Meta;
  };
  artistSlug: string;
  currentYear: string;
  artists: {
    data: { [key: string]: Artist };
    meta: Meta;
  };
};

const YearsColumn = ({
  artistYears,
  artistSlug,
  currentYear,
  artists,
}: YearsColumnProps): JSX.Element => {
  return (
    <Column
      heading={artistYears && artists.data[artistSlug] ? artists.data[artistSlug].name : 'Years'}
      loading={artistYears && artistYears.meta && artistYears.meta.loading}
      loadingAmount={12}
    >
      {artistYears &&
        artistYears.data &&
        sortActiveBands(artistSlug, artistYears.data).map((year: Year) => (
          <Row
            key={year.id}
            href={`/${artistSlug}/${year.year}`}
            active={year.year === currentYear}
          >
            <div>
              <div>{year.year}</div>
            </div>
            <div className="desc">
              <div>{simplePluralize('show', year.show_count)}</div>
              <div>{simplePluralize('tape', year.source_count)}</div>
            </div>
          </Row>
        ))}
    </Column>
  );
};

const mapStateToProps = ({ years, app, artists }): YearsColumnProps => ({
  artistYears: years[app.artistSlug],
  artistSlug: app.artistSlug,
  currentYear: app.year,
  artists,
});

export default connect(mapStateToProps)(YearsColumn);
