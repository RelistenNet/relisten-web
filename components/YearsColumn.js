import Link from 'next/link'
import { connect } from 'react-redux'

import { simplePluralize } from '../lib/utils'

import Column from './Column';
import Row from './Row';

const YearsColumn = ({ artistYears, artistSlug, currentYear }) => (
  <Column heading="Years" loading={artistYears.meta && artistYears.meta.loading} loadingAmount={12}>
    {artistYears && artistYears.data && artistYears.data.map(year =>
      <Row key={year.id} href={`/${artistSlug}/${year.year}`} active={year.year === currentYear}>
        <div>
          <div>{year.year}</div>
        </div>
        <div className="desc">
          <div>{simplePluralize('show', year.show_count)}</div>
          <div>{simplePluralize('tape', year.source_count)}</div>
        </div>
      </Row>
    )}
  </Column>
)

const mapStateToProps = ({ years, app }) => ({ artistYears: years[app.artistSlug], artistSlug: app.artistSlug, currentYear: app.year })

export default connect(mapStateToProps)(YearsColumn)
