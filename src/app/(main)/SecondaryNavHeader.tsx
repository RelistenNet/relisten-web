'use client';

import Link from 'next/link';
import { usePathname, useSelectedLayoutSegments } from 'next/navigation';

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
  const [group, artistSlug] = useSelectedLayoutSegments();

  const pageMetadata = pages[key];

  if ((group === '(secondary)' || group === '(tertiary)') && pageMetadata) {
    return (
      <>
        <span className="to">{pageMetadata.prefix}</span>
        <Link href={pathname}>{pageMetadata.title}</Link>
      </>
    );
  }

  if (group === '(home)' && artistSlug) {
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
