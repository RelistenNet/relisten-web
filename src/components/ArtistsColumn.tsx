import React from 'react';
import { connect } from 'react-redux';
import { simplePluralize, groupBy } from '../lib/utils';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import { Artist } from '../types';

const byObject = {
  wsp: 'PanicStream',
  phish: 'Phish.in',
};

type ArtistsColumnProps = {
  artists?: {
    data: Artist;
  };
  artistSlug: string;
};

const ArtistsColumn = ({ artists, artistSlug }: ArtistsColumnProps): JSX.Element => {
  return (
    <Column heading="Bands">
      {artists &&
        artists.data &&
        Object.entries(groupBy(Object.values(artists.data), 'featured'))
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([type, artists]: [string, Artist[]]) => [
            <RowHeader key={`header-${type}`}>{type === '1' ? 'Featured' : 'Bands'}</RowHeader>,
            ...artists.map((artist: Artist, idx: number) => (
              <Row
                key={[idx, artist.id].join(':')}
                href={`/${artist.slug}`}
                active={artist.slug === artistSlug}
              >
                <div>
                  {artist.name}
                  {byObject[artist.slug] && (
                    <span className="subtext">Powered by {byObject[artist.slug]}</span>
                  )}
                </div>
                <div>
                  <div>{simplePluralize('show', artist.show_count)}</div>
                  <div>{simplePluralize('tape', artist.source_count)}</div>
                </div>
              </Row>
            )),
          ])}
    </Column>
  );
};

const mapStateToProps = ({ artists, app }): ArtistsColumnProps => ({
  artists,
  artistSlug: app.artistSlug,
});

export default connect(mapStateToProps)(ArtistsColumn);
