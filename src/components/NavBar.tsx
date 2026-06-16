import { Link } from '@timber-js/app/client';
import Flex from './Flex';
import Menu from './Menu';
import Player from './Player';
import * as Popover from '@/components/Popover';
import RelistenAPI from '@/lib/RelistenAPI';
import MainNavHeader from './MainNavHeader';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import BlogNavIndicator from './blog/BlogNavLink';
import GlobalSearch from './GlobalSearch';
import { MenuIcon } from 'lucide-react';
import { getHeaders } from '@timber-js/app/server';
import { UAParser } from 'ua-parser-js';
import { getIsInIframe } from '@/lib/isInIframe';
import { hasRecentPost } from '@/lib/blog/getPosts';

export const getUserAgent = async () => {
  const headersList = await getHeaders();
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
  const blogHasNew = hasRecentPost();

  const artistSlugsToName = artists.reduce(
    (memo, next) => {
      memo[String(next.slug)] = next.name;

      return memo;
    },
    {} as Record<string, string | undefined>
  );

  return (
    <>
      <div
        className="
          navigation relative grid h-[50px] max-h-[50px] min-h-[50px] grid-cols-[auto_1fr_auto]
          border-b border-b-hairline bg-surface-raised px-2 text-text-primary
          lg:grid-cols-[1fr_auto_1fr] lg:px-4
        "
      >
        <MainNavHeader
          artistSlugsToName={artistSlugsToName}
          indexOverride={isInIframe ? '/wsp' : undefined}
        />
        <div
          className="
            player overflow-hidden text-center
            lg:max-w-[44vw] lg:min-w-[44vw] lg:justify-self-center
            xl:max-w-[38vw] xl:min-w-[38vw]
          "
        >
          <Player artistSlugsToName={artistSlugsToName} />
        </div>

        <div className="flex items-center justify-self-end">
          <GlobalSearch />

          <Popover.Root>
            <Popover.Trigger
              className="
                ml-2 h-full w-min cursor-pointer content-end items-center
                text-center font-medium
                xl:hidden
              "
            >
              <Flex
                className="
                  h-full cursor-pointer content-end items-center text-center font-medium
                  xl:hidden
                "
              >
                <div
                  className="
                    ml-auto flex h-full items-center
                    active:relative active:top-px active:text-foreground
                  "
                >
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

          <div
            className="
              nav hidden h-full cursor-pointer items-center gap-0.5 text-center
              text-[13px] font-medium text-text-secondary
              xl:flex
            "
          >
            <Link className="nav-btn" href="/today" prefetch={false}>
              Today
            </Link>
            <Link className="nav-btn whitespace-nowrap" href="/recently-played" prefetch={false}>
              Live
            </Link>
            <Link className="nav-btn" href="/chat" prefetch={false}>
              Chat
            </Link>
            <Link className="nav-btn" href="/app" prefetch={false}>
              App
            </Link>
            <Link className="nav-btn" href="/sonos" prefetch={false}>
              Sonos
            </Link>
            <div className="relative h-full">
              <Link className="nav-btn" href="/blog" prefetch={false}>
                Blog
              </Link>
              <BlogNavIndicator hasNewPost={blogHasNew} />
            </div>
            <Link className="nav-btn" href="/about" prefetch={false}>
              About
            </Link>
          </div>
        </div>
      </div>
      {isAndroid && <AndroidUpgradeNotification />}
    </>
  );
}
