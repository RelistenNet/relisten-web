'use client';

import Link from 'next/link';
import Flex from './Flex';
import SecondaryNavBar from './SecondaryNavHeader';
import { usePathname, useRouter } from 'next/navigation';

export default function MainNavHeader({
  artistSlugsToName,
}: {
  artistSlugsToName: Record<string, string | undefined>;
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
      <Flex className="left h-full flex-1 items-center whitespace-nowrap font-medium max-lg:hidden lg:gap-1">
        <Link href="/" className="ml-1 text-center " prefetch={false} onClick={onClickNav}>
          RELISTEN
        </Link>
        <SecondaryNavBar artistSlugsToName={artistSlugsToName} />
      </Flex>
      <Flex className="h-full px-2 lg:hidden" center>
        <Link href="/" prefetch={false}>
          Re
        </Link>
      </Flex>
    </>
  );
}
