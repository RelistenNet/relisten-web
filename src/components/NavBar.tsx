import { Link } from '@timber-js/app/client';
import Flex from './Flex';
import Menu from './Menu';
import Player from './Player';
import * as Popover from '@/components/Popover';
import RelistenAPI from '@/lib/RelistenAPI';
import MainNavHeader from './MainNavHeader';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import BlogNavIndicator from './blog/BlogNavLink';
// import GlobalSearch from './GlobalSearch';
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
          {/* <GlobalSearch /> */}

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
              text-sm font-medium text-text-secondary
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
              Apps
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
            <a
              className="nav-btn"
              href="https://github.com/RelistenNet/relisten-web"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      {isAndroid && <AndroidUpgradeNotification />}
    </>
  );
}
