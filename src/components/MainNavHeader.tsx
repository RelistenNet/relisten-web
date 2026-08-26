'use client';

import { Link } from '@timber-js/app/client';
import Flex from './Flex';
import SecondaryNavBar from './SecondaryNavHeader';
import { usePathname, useRouter } from '@timber-js/app/client';
import AccountMenu from './account/AccountMenu';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/constants';
import type { AccountSession } from '@/lib/session';

export default function MainNavHeader({
  artistName,
  indexOverride,
  session,
}: {
  artistName?: string;
  indexOverride?: string;
  session: AccountSession;
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
        <SecondaryNavBar artistName={artistName} />
        {ACCOUNTS_FEATURE_ENABLED && <AccountMenu session={session} />}
      </Flex>
      <Flex className="h-full pr-2 font-medium lg:hidden" center>
        <Link href={indexOverride ?? '/'} prefetch={false}>
          Re
        </Link>
      </Flex>
    </>
  );
}
