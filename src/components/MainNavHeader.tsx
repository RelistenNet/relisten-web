'use client';

import Link from 'next/link';
import Flex from './Flex';
import SecondaryNavBar from './SecondaryNavHeader';
import { usePathname, useRouter } from 'next/navigation';

export default function MainNavHeader({
  artistSlugsToName,
  indexOverride,
}: {
  artistSlugsToName: Record<string, string | undefined>;
  indexOverride?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const onClickNav = () => {
    // trigger RSC refresh if clicking nav again
    if (pathname === '/') {
      router.refresh();
    }
  };

  return (
    <>
      <Flex className="left h-full flex-1 items-center font-medium whitespace-nowrap max-lg:hidden lg:gap-1">
        <Link
          href={indexOverride ?? '/'}
          className="text-center"
          prefetch={false}
          onClick={onClickNav}
        >
          RELISTEN
        </Link>
        <SecondaryNavBar artistSlugsToName={artistSlugsToName} />
      </Flex>
      <Flex className="h-full px-2 lg:hidden" center>
        <Link href={indexOverride ?? '/'} prefetch={false}>
          Re
        </Link>
      </Flex>
    </>
  );
}
