import Link from 'next/link';
import Flex from '../../components/Flex';
import Menu from '../../components/Menu';
import Player from '../../components/Player';
import { SimplePopover } from '../../components/Popover';
import { fetchArtists } from '../queries';
import MainNavHeader from './MainNavHeader';
import { getUserAgent } from './layout';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import { MenuIcon } from 'lucide-react';

export default async function NavBar() {
  const artists = await fetchArtists();
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
      <div className="navigation dark:bg-relisten-950 relative flex h-[50px] max-h-[50px] min-h-[50px] grid-cols-3 justify-between border-b-[1px] border-b-[#aeaeae] bg-white text-gray-700 lg:grid dark:text-gray-100">
        <MainNavHeader artistSlugsToName={artistSlugsToName} />
        <div className="player min-w-[60%] flex-1 text-center lg:min-w-[44vw] xl:min-w-[38vw]">
          <Player artistSlugsToName={artistSlugsToName} />
        </div>
        <SimplePopover content={<Menu />}>
          <Flex className="flex-2 h-full cursor-pointer content-end items-center text-center font-medium 2xl:hidden">
            <div className="ml-auto flex h-full items-center px-1 active:relative active:top-[1px]">
              <MenuIcon />
            </div>
          </Flex>
        </SimplePopover>
        <div className="nav flex-2 hidden h-full cursor-pointer items-center justify-end text-center font-medium 2xl:flex">
          <div className="h-full px-1">
            <Link href="/today" legacyBehavior prefetch={false}>
              <a className="nav-btn">TIH</a>
            </Link>
          </div>
          <div>
            <Link href="/recently-played" legacyBehavior prefetch={false}>
              <a className="nav-btn whitespace-nowrap">LIVE</a>
            </Link>
          </div>
          <div>
            <Link href="/chat" legacyBehavior prefetch={false}>
              <a className="nav-btn">CHAT</a>
            </Link>
          </div>
          <div>
            <Link href="/app" legacyBehavior prefetch={false}>
              <a className="nav-btn">APP</a>
            </Link>
          </div>
          <div>
            <Link href="/sonos" legacyBehavior prefetch={false}>
              <a className="nav-btn">SONOS</a>
            </Link>
          </div>
          <div>
            <Link href="/about" legacyBehavior prefetch={false}>
              <a className="nav-btn">ABOUT</a>
            </Link>
          </div>
        </div>
      </div>
      {isAndroid && <AndroidUpgradeNotification />}
    </>
  );
}
