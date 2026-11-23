import { Link } from '@timber-js/app/client';
import { AccountMenu, ExploreMenu, SiteMenu } from './NavMenus';
import Player from '@/player/PlayerBar';
import { Toaster } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';
import MainNavHeader from './MainNavHeader';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import GlobalSearch from './GlobalSearch';
import { CircleUserRoundIcon, SettingsIcon } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import ArtistTabs from './ArtistTabs';
import { accountSection } from './siteSections';
import { hasRecentPost } from '@/lib/blog/getPosts';
import { sessionCookie } from '@/lib/session/sessionCookie';
import { TOASTER_ID } from '@/player/toasts';

// The same on every page: what depends on the page (the artist, the site
// page's title, active tabs) the client components read from the URL and the
// browsing artist (browsingArtistContext). So a 'document' layout renders it
// once, re-rendered only when the user agent or the session cookie changes.
export default function NavBar() {
  const blogHasNew = hasRecentPost();
  const signedIn = sessionCookie.get() !== null;
  const account = accountSection(signedIn);

  return (
    <>
      {/* The player's toasts (playback failures, play prompts), wherever the player is. */}
      <Toaster id={TOASTER_ID} position="top-center" offset="54px" richColors closeButton />
      <div
        className="
          navigation relative grid h-[50px] max-h-[50px] min-h-[50px] grid-cols-[auto_1fr_auto]
          border-b border-b-hairline bg-surface-raised px-2 text-text-primary
          max-lg:sticky max-lg:top-0 max-lg:z-20
          lg:grid-cols-[1fr_auto_1fr] lg:px-4
        "
      >
        <MainNavHeader />
        <div
          className="
            player overflow-hidden text-center
            lg:max-w-[44vw] lg:min-w-[44vw] lg:justify-self-center
            xl:max-w-[38vw] xl:min-w-[38vw]
          "
        >
          <Player />
        </div>

        <div
          className="
            flex h-full items-center gap-0.5 justify-self-end text-sm font-medium
          "
        >
          <GlobalSearch />

          <nav aria-label="Site" className="hidden h-full items-center xl:flex">
            <ExploreMenu className="nav-btn cursor-pointer gap-1 whitespace-nowrap" />
          </nav>

          <SiteMenu
            signedIn={signedIn}
            blogHasNew={blogHasNew}
            className="nav-btn ml-2 cursor-pointer gap-1 xl:ml-0"
          />

          <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-hairline max-xl:hidden" />
          {signedIn ? (
            <AccountMenu className="nav-btn cursor-pointer gap-1.5 whitespace-nowrap max-xl:hidden" />
          ) : (
            <Link
              className="nav-btn gap-1.5 whitespace-nowrap max-xl:hidden"
              href={account.href}
              prefetch={false}
            >
              <CircleUserRoundIcon className="size-4" aria-hidden="true" />
              {account.label}
            </Link>
          )}
          {/* At every width: the Site menu holds links only. */}
          <Popover align="end" sideOffset={4}>
            <PopoverTrigger aria-label="Settings" className="nav-btn cursor-pointer">
              <SettingsIcon className="size-4" aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(24rem,calc(100vw-1rem))] gap-0 p-3"
              arrowClassName="hidden"
            >
              <SettingsPanel />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <ArtistTabs />
      <AndroidUpgradeNotification />
    </>
  );
}
