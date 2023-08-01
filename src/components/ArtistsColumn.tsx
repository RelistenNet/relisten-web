'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchArtists } from '../app/queries';
import { groupBy, simplePluralize } from '../lib/utils';
import { Artist } from '../types';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';
import React from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';

const byObject = {
  wsp: 'PanicStream',
  phish: 'Phish.in',
};

const key = ['artists'];

export const useArtists = () => {
  return useSuspenseQuery<Artist[]>({
    queryKey: key,
    queryFn: () => fetchArtists(),
  });
};

const ArtistsColumn = () => {
  const artistSlug = useSelectedLayoutSegment();

  const artists: any = useArtists();

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

export default React.memo(ArtistsColumn);
