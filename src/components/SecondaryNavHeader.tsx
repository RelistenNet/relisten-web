'use client';

import Link from 'next/link';
import { useParams, usePathname, useSelectedLayoutSegments } from 'next/navigation';

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
    prefix: 'TO',
    title: 'RECENTLY PLAYED',
  },
  'chat': {
    prefix: 'WITH',
    title: 'US',
  },
  'about': {
    prefix: 'TO',
    title: 'OUR LIFE STORY',
  },
};

interface Props {
  artistSlugsToName: Record<string, string | undefined>;
}

const bandsWithThe = [
  'duo',
  'bernie-worrell',
  'disco-biscuits',
  'drive-by-truckers',
  'g-nome',
  'grateful-dead',
  'jazz-mandolin-project',
  'phish',
  'sci',
  'smashing-pumpkins',
  'steve-kimock-band',
  'stringdusters',
  'tedeschi-trucks',
];

export default function SecondaryNavBar({ artistSlugsToName }: Props) {
  const pathname = usePathname();
  const key = pathname.replace('/', '');
  const { artistSlug } = useParams();

  const pageMetadata = pages[key];

  if (pageMetadata) {
    return (
      <>
        <span className="to">{pageMetadata.prefix}</span>
        <Link href={pathname}>{pageMetadata.title}</Link>
      </>
    );
  }

  if (typeof artistSlug === 'string') {
    const artistName = artistSlugsToName[artistSlug];
    return (
      <>
        <span>TO</span>
        <Link href={`/${artistSlug}`} className="uppercase">
          {bandsWithThe.includes(artistSlug) ? 'THE ' : ''}
          {artistName}
        </Link>
      </>
    );
  }

  return null;
}
