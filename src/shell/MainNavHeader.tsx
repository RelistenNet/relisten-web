'use client';

import { Link } from '@timber-js/app/client';
import Flex from '@/ui/base/Flex';
import SecondaryNavBar from './SecondaryNavHeader';
import BrandMark from './BrandMark';
import { usePathname, useRouter } from '@timber-js/app/client';
import { useIsInIframe } from '@/lib/useIsInIframe';
import { href } from '@timber-js/app/routes';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { useBrowsingArtist } from './browsingArtistContext';

export default function MainNavHeader() {
  // Embedded players link home to the embed index.
  const indexOverride = useIsInIframe() ? '/wsp' : undefined;
  const pathname = usePathname();
  const router = useRouter();
  // Home is the browse view of the artist being browsed; / browses the default.
  const { browsing } = useBrowsingArtist();
  const home =
    indexOverride ??
    (browsing.slug !== DEFAULT_ARTIST_SLUG
      ? href('/[artistSlug]', { artistSlug: browsing.slug })
      : '/');

  const onClickNav = () => {
    // trigger RSC refresh if clicking nav again
    if (pathname === home) {
      router.refresh();
    }
  };

  return (
    <>
      <Flex className="left h-full flex-1 items-center text-lg font-medium whitespace-nowrap max-lg:hidden lg:gap-1.5">
        <Link
          href={home}
          // The line is sized to the brand mark (text-lg).
          className="flex items-center gap-2 text-center tracking-wide"
          prefetch={false}
          onClick={onClickNav}
        >
          <BrandMark />
          RELISTEN
        </Link>
        <SecondaryNavBar />
      </Flex>
      <Flex className="h-full pr-2 font-medium lg:hidden" center>
        <Link href={home} prefetch={false} aria-label="Relisten">
          <BrandMark className="size-7 text-[17px]" />
        </Link>
      </Flex>
    </>
  );
}
