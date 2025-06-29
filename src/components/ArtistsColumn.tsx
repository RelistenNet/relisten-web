import RelistenAPI from '@/lib/RelistenAPI';
import { groupBy, simplePluralize } from '../lib/utils';
import { Artist } from '../types';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';

const byObject = {
  phish: 'Phish.in',
};

const ArtistsColumn = async () => {
  const artists = await RelistenAPI.fetchArtists();

  return (
    <Column heading="Bands">
      {artists &&
        Object.entries(groupBy(Object.values(artists), 'featured'))
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([type, artists]: [string, Artist[]]) => [
            <RowHeader key={`header-${type}`}>{type === '1' ? 'Featured' : 'Bands'}</RowHeader>,
            ...artists.map((artist: Artist, idx: number) => (
              <Row
                key={[idx, artist.id].join(':')}
                href={`/${artist.slug}`}
                activeSegments={{ artistSlug: artist.slug }}
              >
                <div>
                  <div>{artist.name}</div>
                  {byObject[String(artist.slug)] && (
                    <span className="text-xs text-foreground-muted">
                      Powered by {byObject[String(artist.slug)]}
                    </span>
                  )}
                </div>
                <div className="min-w-[20%] text-right text-xs text-foreground-muted">
                  <div>{simplePluralize('show', artist.show_count)}</div>
                  <div>{simplePluralize('tape', artist.source_count)}</div>
                </div>
              </Row>
            )),
          ])}
    </Column>
  );
};

export default ArtistsColumn;
