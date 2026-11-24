'use client';

import { Link } from '@timber-js/app/client';
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  CircleUserRoundIcon,
  ListMusicIcon,
  LogOutIcon,
  MenuIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useActionState, useEffect, useId } from 'react';
import { toast } from 'sonner';
import BlogNewPostDot from '@/features/blog/BlogNewPostDot';
import { signOut } from '@/features/account/actions';
import { SESSION_ERRORS } from '@/features/account/SessionForms';
import { myPlaylistsHref } from '@/lib/searchParams/publicPlaylistsSearchParams';
import { TOASTER_ID } from '@/player/toasts';
import {
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '@/ui/base/Menu';
import { accountSection, siteSections } from './siteSections';

// The nav bar's dropdowns, on the site's menus (src/ui/base/Menu.tsx): Site
// (about the project; below xl, the listening pages too, which at xl are at the
// artist bar's right end) and My Account. Settings are the cog's, at every width.

const sections = (...groups: string[]) => siteSections.filter((s) => groups.includes(s.group));

/**
 * Sign Out, as the account page's form (a server action). The form lives
 * outside the menu's popup, which closes (and unmounts) on the click, so the
 * item submits it by id. An error shows as a toast.
 */
function useSignOut() {
  const formId = useId();
  const [state, formAction, pending] = useActionState(signOut, null);
  useEffect(() => {
    if (state) toast.error(SESSION_ERRORS[state.error], { toasterId: TOASTER_ID });
  }, [state]);
  return {
    form: <form id={formId} action={formAction} hidden />,
    item: (
      <MenuItem
        icon={LogOutIcon}
        disabled={pending}
        render={<button type="submit" form={formId} className="w-full" />}
      >
        {pending ? 'Signing Out…' : 'Sign Out'}
      </MenuItem>
    ),
  };
}

/** The signed-in listener's menu, at xl (below, its items are in the Site menu). */
export function AccountMenu({ className }: { className?: string }) {
  const signOut = useSignOut();
  return (
    <>
      {signOut.form}
      <MenuRoot>
        <MenuTrigger className={className}>
          <CircleUserRoundIcon className="size-4" aria-hidden="true" />
          My Account
          <ChevronDownIcon className="size-3.5" aria-hidden="true" />
        </MenuTrigger>
        <MenuContent align="end">
          <AccountItems signOut={signOut.item} />
        </MenuContent>
      </MenuRoot>
    </>
  );
}

function AccountItems({ signOut, className }: { signOut: React.ReactNode; className?: string }) {
  return (
    <>
      <MenuLinkItem
        icon={ListMusicIcon}
        className={className}
        render={<Link href={myPlaylistsHref()} prefetch={false} />}
      >
        My Playlists
      </MenuLinkItem>
      <MenuLinkItem
        icon={UserRoundIcon}
        className={className}
        render={<Link href={accountSection(true).href} prefetch={false} />}
      >
        Account
      </MenuLinkItem>
      <MenuSeparator className={className} />
      <div className={className}>{signOut}</div>
    </>
  );
}

/**
 * About the project (Blog, Chat, Apps, About, GitHub). Below xl, where the nav
 * shows none of its links, it also holds the listening pages and the
 * account's items.
 */
export function SiteMenu({
  signedIn,
  blogHasNew,
  className,
}: {
  signedIn: boolean;
  blogHasNew: boolean;
  className?: string;
}) {
  const signOut = useSignOut();
  const narrow = 'xl:hidden';
  return (
    <>
      {signedIn && signOut.form}
      <MenuRoot>
        <MenuTrigger className={className}>
          <MenuIcon className="xl:hidden" aria-hidden="true" />
          <span className="sr-only xl:hidden">Menu</span>
          <span className="max-xl:hidden">Site</span>
          <BlogNewPostDot hasNewPost={blogHasNew} className="absolute top-1 right-1" />
          <ChevronDownIcon className="size-3.5 max-xl:hidden" aria-hidden="true" />
        </MenuTrigger>
        <MenuContent align="end">
          {sections('explore').map((s) => (
            <MenuLinkItem
              key={s.href}
              className={narrow}
              render={<Link href={s.href} prefetch={false} />}
            >
              {s.label}
            </MenuLinkItem>
          ))}
          <MenuSeparator className={narrow} />
          {sections('more').map((s) => (
            <MenuLinkItem key={s.href} render={<Link href={s.href} prefetch={false} />}>
              {s.label}
              {s.label === 'Blog' && <BlogNewPostDot hasNewPost={blogHasNew} />}
            </MenuLinkItem>
          ))}
          <MenuLinkItem
            render={
              <a
                href="https://github.com/RelistenNet/relisten-web"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            GitHub
            <ArrowUpRightIcon className="ml-auto size-4" aria-label="(opens in a new tab)" />
          </MenuLinkItem>
          <MenuSeparator className={narrow} />
          {signedIn ? (
            <AccountItems signOut={signOut.item} className={narrow} />
          ) : (
            <MenuLinkItem
              icon={CircleUserRoundIcon}
              className={narrow}
              render={<Link href={accountSection(false).href} prefetch={false} />}
            >
              {accountSection(false).label}
            </MenuLinkItem>
          )}
        </MenuContent>
      </MenuRoot>
    </>
  );
}
