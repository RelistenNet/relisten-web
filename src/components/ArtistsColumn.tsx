'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchArtists } from '../app/queries';
import { groupBy, simplePluralize } from '../lib/utils';
import { Artist } from '../types';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';

const byObject = {
  wsp: 'PanicStream',
  phish: 'Phish.in',
};

const key = ['artists'];

const ArtistsColumn = ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const artists: any = useSuspenseQuery({
    queryKey: key,
    queryFn: () => fetchArtists(),
  });

  return (
    <Column heading="Bands">
      {artists?.data &&
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
                <div className={artist.slug === artistSlug ? 'pl-2' : ''}>
                  {artist.name}
                  {byObject[String(artist.slug)] && (
                    <span className="text-[0.7em] text-[#979797]">
                      Powered by {byObject[String(artist.slug)]}
                    </span>
                  )}
                </div>
                <div className="min-w-[20%] text-right text-[0.7em] text-[#979797]">
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
