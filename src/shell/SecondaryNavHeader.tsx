'use client';

import { Link, usePathname, useSelectedLayoutSegments } from '@timber-js/app/client';
import ArtistPicker from './ArtistPicker';

const pages = {
  'sonos': {
    prefix: 'ON',
    title: 'SONOS',
  },
  'app': {
    prefix: 'ON THE',
    title: 'GO',
  },
  'today': {
    prefix: 'TO',
    title: 'TODAY IN HISTORY',
  },
  'recently-played': {
    prefix: 'WITH',
    title: 'OTHERS',
  },
  'chat': {
    prefix: 'WITH',
    title: 'US',
  },
  'about': {
    prefix: 'TO',
    title: 'OUR LIFE STORY',
  },
  'blog': {
    prefix: 'TO',
    title: 'OUR BLOG',
  },
};

interface Props {
  /** The page's artist: the URL's, or the default artist on the browse root. */
  artist?: { slug: string; name: string };
}

const bandsWithThe = [
  'duo',
  'bernie-worrell',
  'disco-biscuits',
  'drive-by-truckers',
  'g-nome',
  'jazz-mandolin-project',
  'phish',
  'sci',
  'smashing-pumpkins',
  'steve-kimock-band',
  'stringdusters',
  'tedeschi-trucks',
];

export default function SecondaryNavBar({ artist }: Props) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();

  const pageMetadata = pages[segments[0]];

  if (pageMetadata) {
    return (
      <>
        <span className="to">{pageMetadata.prefix}</span>
        <Link href={pathname}>{pageMetadata.title}</Link>
      </>
    );
  }

  if (artist) {
    return (
      <>
        <span>TO</span>
        <ArtistPicker current={artist} variant="title">
          {bandsWithThe.includes(artist.slug) ? 'THE ' : ''}
          {artist.name}
        </ArtistPicker>
      </>
    );
  }

  return null;
}
