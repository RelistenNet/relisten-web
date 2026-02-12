import Link from 'next/link';
import Flex from './Flex';
import Menu from './Menu';
import Player from './Player';
import * as Popover from '@/components/Popover';
import RelistenAPI from '@/lib/RelistenAPI';
import MainNavHeader from './MainNavHeader';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import ThemeToggle from './ThemeToggle';
import { MenuIcon } from 'lucide-react';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';
import { getIsInIframe } from '@/lib/isInIframe';

export const getUserAgent = async () => {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');

  if (!userAgent) return null;

  return UAParser(userAgent);
};

export default async function NavBar() {
  const [artists, userAgent, isInIframe] = await Promise.all([
    RelistenAPI.fetchArtists(),
    getUserAgent(),
    getIsInIframe(),
  ]);
  const isAndroid = /android/i.test(userAgent?.ua || '');

  const artistSlugsToName = artists.reduce(
    (memo, next) => {
      memo[String(next.slug)] = next.name;

      return memo;
    },
    {} as Record<string, string | undefined>
  );

  return (
    <>
      <div className="navigation text-foreground relative flex h-[50px] max-h-[50px] min-h-[50px] grid-cols-3 justify-between border-b-[1px] border-b-border bg-surface px-4 lg:grid">
        <MainNavHeader
          artistSlugsToName={artistSlugsToName}
          indexOverride={isInIframe ? '/wsp' : undefined}
        />
        <div className="player min-w-[60%] flex-1 text-center lg:min-w-[44vw] xl:min-w-[38vw]">
          <Player artistSlugsToName={artistSlugsToName} />
        </div>

        <Popover.Root>
          <Popover.Trigger className="ml-2 ml-auto h-full w-min cursor-pointer content-end items-center text-center font-medium xl:hidden">
            <Flex className="ml-2 h-full cursor-pointer content-end items-center text-center font-medium xl:hidden">
              <div className="active:text-foreground active:relative active:top-[1px] ml-auto flex h-full items-center px-1">
                <MenuIcon />
              </div>
            </Flex>
          </Popover.Trigger>
          {/* <Popover.Anchor /> */}
          <Popover.Portal>
            <Popover.Content>
              <Menu />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <div className="nav hidden h-full flex-2 cursor-pointer items-center justify-end gap-4 text-center font-medium xl:flex">
          <div className="h-full">
            <Link className="nav-btn" href="/today" prefetch={false}>
              TIH
            </Link>
          </div>
          <div>
            <Link className="nav-btn whitespace-nowrap" href="/recently-played" prefetch={false}>
              LIVE
            </Link>
          </div>
          <div>
            <Link className="nav-btn" href="/chat" prefetch={false}>
              CHAT
            </Link>
          </div>
          <div>
            <Link className="nav-btn" href="/app" prefetch={false}>
              APP
            </Link>
          </div>
          <div>
            <Link className="nav-btn" href="/sonos" prefetch={false}>
              SONOS
            </Link>
          </div>
          <div>
            <Link className="nav-btn" href="/about" prefetch={false}>
              ABOUT
            </Link>
          </div>
          <div className="h-full">
            <ThemeToggle />
          </div>
        </div>
      </div>
      {isAndroid && <AndroidUpgradeNotification />}
    </>
  );
}
