'use client';

import Link from 'next/link';
import Flex from '../../components/Flex';
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
    <Flex className="left h-full flex-1 items-center font-medium lg:gap-1">
      <Link
        href="/"
        className="ml-1 hidden text-center lg:flex"
        prefetch={false}
        onClick={onClickNav}
      >
        RELISTEN
      </Link>
      <SecondaryNavBar artistSlugsToName={artistSlugsToName} />
      <Link href="/" className="hidden" legacyBehavior prefetch={false}>
        <Flex as={'a'} className="items-center px-2 lg:hidden">
          Re
        </Flex>
      </Link>
      <Link href="/" legacyBehavior prefetch={false}>
        <Flex as={'a'} className="items-center px-2 lg:hidden">
          (go back)
        </Flex>
      </Link>
    </Flex>
  );
}
