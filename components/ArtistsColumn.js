import { connect } from 'react-redux'

import Column from './Column'
import Row from './Row'

const ArtistsColumn = ({ artists = {} }) => (
  <Column heading="Artists">
    <style jsx>{`
      span {
        align-self: flex-end;
        color: #CCC;
      }
    `}</style>
    {artists.data.map(artist =>
      <Row key={artist.id} href={`/${artist.slug}`}>
        {artist.name} <span>{artist.source_count}</span>
      </Row>
    )}
  </Column>
)

const mapStateToProps = ({ artists }) => ({ artists })

export default connect(mapStateToProps)(ArtistsColumn)
