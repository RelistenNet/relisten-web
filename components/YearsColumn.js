import Link from 'next/link'
import { connect } from 'react-redux'

import Column from './Column';
import Row from './Row';

const YearsColumn = ({ artistYears, artistSlug }) => (
  <Column heading="Years">
    <style jsx>{`
      .column {
        display: flex;
        flex: 1;
      }
    `}</style>
    {artistYears && artistYears.data.map(year =>
      <Row key={year.id} href={`/${artistSlug}/${year.year}`}>
        <div>{year.year}</div>
        <div>desc</div>
      </Row>
    )}
  </Column>
)

const mapStateToProps = ({ years, app }) => ({ artistYears: years[app.artistSlug], artistSlug: app.artistSlug })

export default connect(mapStateToProps)(YearsColumn)
