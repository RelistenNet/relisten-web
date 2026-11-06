import { loadArtists } from '@/features/browse/load';
import { Link } from '@timber-js/app/client';
import Flex from './Flex';
import Menu from './Menu';
import Player from './Player';
import * as Popover from '@/components/Popover';
import MainNavHeader from './MainNavHeader';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import BlogNavLink from './blog/BlogNavLink';
// import GlobalSearch from './GlobalSearch';
import { EllipsisIcon, MenuIcon } from 'lucide-react';
import ArtistTabs from './ArtistTabs';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { getHeaders, getSegmentParams } from '@timber-js/app/server';
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
    loadArtists(),
    getUserAgent(),
    getIsInIframe(),
  ]);
  const isAndroid = /android/i.test(userAgent?.ua || '');
  const blogHasNew = hasRecentPost();

  const { artistSlug } = getSegmentParams() as { artistSlug?: string };
  const artist = artistSlug ? artists.find((a) => a.slug === artistSlug) : undefined;
  const artistName = artist?.name;
  const tabsArtist = artist ?? artists.find((a) => a.slug === DEFAULT_ARTIST_SLUG);

  return (
    <>
      <div
        className="
          navigation relative grid h-[50px] max-h-[50px] min-h-[50px] grid-cols-[auto_1fr_auto]
          border-b border-b-hairline bg-surface-raised px-2 text-text-primary
          max-lg:sticky max-lg:top-0 max-lg:z-20
          lg:grid-cols-[1fr_auto_1fr] lg:px-4
        "
      >
        <MainNavHeader artistName={artistName} indexOverride={isInIframe ? '/wsp' : undefined} />
        <div
          className="
            player overflow-hidden text-center
            lg:max-w-[44vw] lg:min-w-[44vw] lg:justify-self-center
            xl:max-w-[38vw] xl:min-w-[38vw]
          "
        >
          <Player />
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
            <BlogNavLink hasNewPost={blogHasNew} />
            <Popover.Root>
              <Popover.Trigger className="nav-btn" aria-label="More">
                <EllipsisIcon className="size-4 shrink-0" aria-hidden />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={4}>
                  <MoreMenu />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </div>
      {/* Always present, so the layout doesn't jump between pages: the artist in
          the URL, else the default artist (what / browses). */}
      {tabsArtist?.slug && (
        <ArtistTabs artistSlug={tabsArtist.slug} features={tabsArtist.features} />
      )}
      {isAndroid && <AndroidUpgradeNotification />}
    </>
  );
}

/** Site links that don't need a spot in the bar. */
function MoreMenu() {
  const items = [
    { href: '/chat', label: 'Chat' },
    { href: '/app', label: 'Apps' },
    { href: '/about', label: 'About' },
  ];
  return (
    <ul
      role="list"
      className="
        z-30 flex w-40 flex-col rounded-md border border-hairline bg-surface py-1 text-sm
        shadow-lg dark:shadow-none
      "
    >
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            prefetch={false}
            className="flex px-3 py-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            {item.label}
          </Link>
        </li>
      ))}
      <li>
        <a
          href="https://github.com/RelistenNet/relisten-web"
          target="_blank"
          rel="noopener noreferrer"
          className="flex px-3 py-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          GitHub
        </a>
      </li>
    </ul>
  );
}
