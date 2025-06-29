import Link from 'next/link';
import Flex from './Flex';
import Menu from './Menu';
import Player from './Player';
import { SimplePopover } from './Popover';
import RelistenAPI from '@/lib/RelistenAPI';
import MainNavHeader from './MainNavHeader';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import { MenuIcon } from 'lucide-react';
import { headers } from 'next/headers';
import parser from 'ua-parser-js';

export const getUserAgent = async () => {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');

  if (!userAgent) return null;

  return parser(userAgent);
};

export default async function NavBar() {
  const artists = await RelistenAPI.fetchArtists();
  const userAgent = await getUserAgent();
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
      <div className="navigation relative flex h-[50px] max-h-[50px] min-h-[50px] grid-cols-3 justify-between border-b-[1px] border-b-[#aeaeae] bg-white text-foreground lg:grid">
        <MainNavHeader artistSlugsToName={artistSlugsToName} />
        <div className="player min-w-[60%] flex-1 text-center lg:min-w-[44vw] xl:min-w-[38vw]">
          <Player artistSlugsToName={artistSlugsToName} />
        </div>
        <SimplePopover content={<Menu />}>
          <Flex className="ml-2 h-full cursor-pointer content-end items-center text-center font-medium 2xl:hidden">
            <div className="ml-auto flex h-full items-center px-1 active:relative active:top-[1px] active:text-foreground">
              <MenuIcon />
            </div>
          </Flex>
        </SimplePopover>
        <div className="nav flex-2 hidden h-full cursor-pointer items-center justify-end text-center font-medium 2xl:flex">
          <div className="h-full px-1">
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
        </div>
      </div>
      {isAndroid && <AndroidUpgradeNotification />}
    </>
  );
}
