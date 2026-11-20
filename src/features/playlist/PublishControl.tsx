'use client';

import { Menu } from '@base-ui/react/menu';
import { Link, useRouter } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import {
  BanIcon,
  ChevronDownIcon,
  CopyIcon,
  EyeIcon,
  GlobeIcon,
  LockIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import cn from '@/lib/cn';
import { MENU_ITEM, MENU_POPUP } from '@/player/menuStyles';
import { TOASTER_ID } from '@/player/toasts';
import { PlaylistWriteError, playlistTransport } from '@/playlists/transport';
import { Button } from '@/ui/base/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/base/shadcn/dialog';
import { ACTION } from './PlaylistArticle';
import { refreshPublicPlaylist } from './publishActions';

// Publishing (RE-52; RelistenApi docs/design/2026-11-18-playlist-sharing.md): a
// playlist is private until its owner publishes it, then anyone with its link
// can read and play it. Publishing asks first, since everything the author wrote
// goes public; unpublishing doesn't (it's undone as easily). A playlist taken
// down after a report stays private until it's reviewed.

const notify = {
  ok: (message: string) => toast.success(message, { toasterId: TOASTER_ID }),
  error: (message: string) => toast.error(message, { toasterId: TOASTER_ID }),
};

const publicUrl = (publicCode: string) =>
  new URL(href('/playlists/[publicCode]', { publicCode }), window.location.origin).href;

export default function PublishControl({
  playlistId,
  publicCode,
  takenDown,
}: {
  playlistId: string;
  /** Set while it's published. */
  publicCode?: string;
  takenDown: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const previewHref = href('/account/playlists/[playlistId]/preview', { playlistId });

  const copy = async (code: string, message = 'Link copied.') => {
    try {
      await navigator.clipboard.writeText(publicUrl(code));
      notify.ok(message);
    } catch {
      notify.ok(`${message.replace(' Link copied.', '')} ${publicUrl(code)}`);
    }
  };

  const setPublished = (published: boolean) =>
    startTransition(async () => {
      try {
        const result = await playlistTransport.publish(playlistId, published);
        const code = result.public_code ?? publicCode;
        // The public page caches for a minute: have it read the change now.
        if (code) await refreshPublicPlaylist(code);
        router.refresh();
        if (published && code) {
          await copy(code, 'Published. Link copied.');
        } else if (!published) notify.ok('Unpublished. Only you can see it now.');
      } catch (err) {
        notify.error(
          err instanceof PlaylistWriteError && err.kind === 'signed-out'
            ? 'Sign in to publish.'
            : err instanceof PlaylistWriteError && err.detail
              ? err.detail
              : `Couldn’t ${published ? 'publish' : 'unpublish'} it. Try again in a moment.`
        );
      }
    });

  const state: { label: string; icon: LucideIcon } = takenDown
    ? { label: 'Taken Down', icon: BanIcon }
    : publicCode
      ? { label: 'Published', icon: GlobeIcon }
      : { label: 'Private', icon: LockIcon };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          disabled={pending}
          className={cn(
            ACTION,
            publicCode && 'border-accent/40 text-accent',
            pending && 'opacity-60'
          )}
        >
          <state.icon className="size-4" aria-hidden />
          {pending ? 'Saving…' : state.label}
          <ChevronDownIcon className="size-3.5 text-text-muted" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="z-50 outline-none">
            <Menu.Popup className={cn(MENU_POPUP, 'max-w-72')}>
              {takenDown ? (
                <p className="m-0 px-2.5 py-2 text-sm text-text-muted">
                  Taken down after a report. It stays private until it’s been reviewed.
                </p>
              ) : publicCode ? (
                <>
                  <Menu.Item className={MENU_ITEM} onClick={() => void copy(publicCode)}>
                    <CopyIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                    Copy Link
                  </Menu.Item>
                  <Menu.LinkItem
                    className={MENU_ITEM}
                    closeOnClick
                    render={<Link href={href('/playlists/[publicCode]', { publicCode })} />}
                  >
                    <GlobeIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                    Open Public Page
                  </Menu.LinkItem>
                  <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />
                  <Menu.Item className={MENU_ITEM} onClick={() => setPublished(false)}>
                    <LockIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                    Unpublish
                  </Menu.Item>
                </>
              ) : (
                <Menu.Item className={MENU_ITEM} onClick={() => setConfirming(true)}>
                  <GlobeIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                  Publish…
                </Menu.Item>
              )}
              {!publicCode && (
                <Menu.LinkItem
                  className={MENU_ITEM}
                  closeOnClick
                  render={<Link href={previewHref} />}
                >
                  <EyeIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                  Preview as Public
                </Menu.LinkItem>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish this playlist?</DialogTitle>
            <DialogDescription>
              Anyone with its link can play it and read everything you’ve written in it. You can
              unpublish it any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                setPublished(true);
              }}
            >
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
