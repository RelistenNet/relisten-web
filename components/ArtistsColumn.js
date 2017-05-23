import { connect } from 'react-redux'

import { simplePluralize } from '../lib/utils'

import Column from './Column'
import Row from './Row'

const ArtistsColumn = ({ artists = {}, artistSlug }) => (
  <Column heading="Artists">
    <style jsx>{`
    `}</style>
    {artists && artists.data && artists.data.map(artist =>
      <Row key={artist.id} href={`/${artist.slug}`} active={artist.slug === artistSlug}>
        <div>{artist.name}</div>
        <div>
          <div>{simplePluralize('show', artist.show_count)}</div>
          <div>{simplePluralize('tape', artist.source_count)}</div>
        </div>
      </Row>
    )}
  </Column>
)

const mapStateToProps = ({ artists, app }) => ({ artists, artistSlug: app.artistSlug })

export default connect(mapStateToProps)(ArtistsColumn)
