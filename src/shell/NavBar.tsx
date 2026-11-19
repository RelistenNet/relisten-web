import { Link } from '@timber-js/app/client';
import Menu from './Menu';
import Player from '@/player/PlayerBar';
import { Toaster } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';
import MainNavHeader from './MainNavHeader';
import AndroidUpgradeNotification from './AndroidUpgradeNotification';
import BlogNewPostDot from '@/features/blog/BlogNewPostDot';
// import GlobalSearch from './GlobalSearch';
import { ChevronDownIcon, CircleUserRoundIcon, MenuIcon, SettingsIcon } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import ArtistTabs from './ArtistTabs';
import { accountSection, siteSections } from './siteSections';
import { hasRecentPost } from '@/lib/blog/getPosts';
import { sessionCookie } from '@/lib/session/sessionCookie';

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
      <Toaster id="audio-error" position="top-center" offset="54px" richColors closeButton />
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
          {/* <GlobalSearch /> */}

          <nav aria-label="Site" className="hidden h-full items-center gap-0.5 xl:flex">
            {siteSections
              .filter((section) => section.group === 'primary')
              .map((section) => (
                <Link
                  key={section.href}
                  className="nav-btn whitespace-nowrap"
                  href={section.href}
                  prefetch={false}
                >
                  {section.label}
                </Link>
              ))}
          </nav>

          <Popover align="end" sideOffset={4}>
            <PopoverTrigger className="nav-btn ml-2 cursor-pointer gap-1 xl:ml-0">
              <MenuIcon className="xl:hidden" aria-hidden="true" />
              <span className="sr-only xl:hidden">Menu</span>
              <span className="max-xl:hidden">Site</span>
              <BlogNewPostDot hasNewPost={blogHasNew} className="absolute top-1 right-1" />
              <ChevronDownIcon className="size-3.5 max-xl:hidden" aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent
              className="w-44 gap-0 rounded-lg border border-hairline bg-surface p-1 shadow-lg max-xl:w-80"
              arrowClassName="hidden"
            >
              <Menu signedIn={signedIn} blogHasNew={blogHasNew} />
            </PopoverContent>
          </Popover>

          <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-hairline max-xl:hidden" />
          <Link
            className="nav-btn gap-1.5 whitespace-nowrap max-xl:hidden"
            href={account.href}
            prefetch={false}
          >
            {signedIn && <CircleUserRoundIcon className="size-4" aria-hidden="true" />}
            {account.label}
          </Link>
          <Popover align="end" sideOffset={4}>
            <PopoverTrigger aria-label="Settings" className="nav-btn cursor-pointer max-xl:hidden">
              <SettingsIcon className="size-4" aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent className="w-96 gap-0 p-3" arrowClassName="hidden">
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
