'use client';

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
import { refreshPublicPlaylist } from './publishActions';
import {
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '@/ui/base/Menu';

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
  new URL(href('/playlists/[playlist]', { playlist: publicCode }), window.location.origin).href;

export default function PublishControl({
  playlistId,
  publicCode,
  takenDown,
  beforePublish,
}: {
  playlistId: string;
  /** Set while it's published. */
  publicCode?: string;
  takenDown: boolean;
  /**
   * The editor's: saves what's waiting, so what's published is what's on screen.
   * Resolves with why it couldn't (then nothing is published), or null.
   */
  beforePublish?: () => Promise<string | null>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const previewHref = href('/playlists/[playlist]/preview', { playlist: playlistId });

  const copy = async (code: string, done = 'Link copied.') => {
    try {
      await navigator.clipboard.writeText(publicUrl(code));
      notify.ok(done);
    } catch {
      // No clipboard here (permission, an insecure origin): show the link instead.
      notify.ok(`Copy the link: ${publicUrl(code)}`);
    }
  };

  const setPublished = (published: boolean) =>
    startTransition(async () => {
      try {
        const unsaved = published && beforePublish ? await beforePublish() : null;
        if (unsaved) {
          notify.error(`${unsaved} It wasn’t published.`);
          return;
        }
        const result = await playlistTransport.publish(playlistId, published);
        const code = result.public_code ?? publicCode;
        // The public page caches for a minute: have it read the change now.
        await refreshPublicPlaylist(playlistId);
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
      <MenuRoot>
        <MenuTrigger
          disabled={pending}
          className={cn(
            publicCode ? 'header-action-active' : 'header-action',
            pending && 'opacity-60'
          )}
        >
          <state.icon className="size-4" aria-hidden />
          {pending ? 'Saving…' : state.label}
          <ChevronDownIcon className="size-3.5 text-text-muted" aria-hidden />
        </MenuTrigger>
        <MenuContent align="end">
          {takenDown ? (
            <p className="m-0 px-2.5 py-2 text-sm text-text-muted">
              Taken down after a report. It stays private until it’s been reviewed.
            </p>
          ) : publicCode ? (
            <>
              <MenuItem onClick={() => void copy(publicCode)} icon={CopyIcon}>
                Copy Link
              </MenuItem>
              <MenuLinkItem
                render={<Link href={href('/playlists/[playlist]', { playlist: publicCode })} />}
                icon={GlobeIcon}
              >
                Open Public Page
              </MenuLinkItem>
              <MenuSeparator />
              <MenuItem onClick={() => setPublished(false)} icon={LockIcon}>
                Unpublish
              </MenuItem>
            </>
          ) : (
            <MenuItem onClick={() => setConfirming(true)} icon={GlobeIcon}>
              Publish…
            </MenuItem>
          )}
          {!publicCode && (
            <MenuLinkItem render={<Link href={previewHref} />} icon={EyeIcon}>
              Preview as Public
            </MenuLinkItem>
          )}
        </MenuContent>
      </MenuRoot>

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
