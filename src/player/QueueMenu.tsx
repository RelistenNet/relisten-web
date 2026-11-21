'use client';

import { Menu } from '@base-ui/react/menu';
import { Link } from '@timber-js/app/client';
import { EllipsisVerticalIcon, ListEndIcon, ListStartIcon, MusicIcon } from 'lucide-react';
import { useState } from 'react';
import cn from '@/lib/cn';
import { toast } from 'sonner';
import { AddToPlaylistSubmenu, NewPlaylistDialog, type PlaylistTracks } from './AddToPlaylist';
import { addToQueue, playNext, queueShow, showTrackIds } from './commands';
import { MENU_ITEM as ITEM, MENU_POPUP } from './menuStyles';
import { TOASTER_ID } from './toasts';
import type { QueueTarget } from './QueueButtons';

/** A page the menu links to, below the queue actions. */
export type QueueMenuLink = { label: string; href: string };

/**
 * A track's or show's "⋯" menu: Play next, Add to queue, Add to Playlist, then
 * any links (its songs' pages).
 */
export default function QueueMenu({
  links,
  name: givenName,
  className,
  ...target
}: QueueTarget & {
  links?: QueueMenuLink[];
  /** For screen readers ("More for <name>"); a track's title by default. */
  name?: string;
  className?: string;
}) {
  const item = 'item' in target ? target.item : null;
  const showId = 'showId' in target ? target.showId : null;
  // The New Playlist dialog outlives the menu, which closes when it's chosen.
  const [naming, setNaming] = useState(false);
  if (!item && !showId) return null;
  const name = givenName ?? item?.title ?? 'show';
  const tracks: PlaylistTracks = async () =>
    item ? { trackIds: [item.trackId] } : showId ? await showTrackIds(showId) : null;
  const run = (where: 'next' | 'end') => () => {
    if (item) (where === 'next' ? playNext : addToQueue)([item]);
    else if (showId)
      void queueShow(showId, where).then(
        (ok) => ok || toast.error("Couldn't load that show", { toasterId: TOASTER_ID })
      );
  };
  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`More for ${name}`}
          className={cn(
            `
            relative inline-flex size-8 shrink-0 items-center justify-center rounded-md
            text-text-muted hover:bg-surface-hover hover:text-text-primary
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
            data-popup-open:bg-surface-hover data-popup-open:text-text-primary
          `,
            className
          )}
        >
          <EllipsisVerticalIcon size={16} className="shrink-0" aria-hidden />
          <span
            className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
            aria-hidden
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="z-50 outline-none">
            <Menu.Popup className={MENU_POPUP}>
              <Menu.Item className={ITEM} onClick={run('next')}>
                <ListStartIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                Play Next
              </Menu.Item>
              <Menu.Item className={ITEM} onClick={run('end')}>
                <ListEndIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                Add to Queue
              </Menu.Item>
              <AddToPlaylistSubmenu tracks={tracks} onNew={() => setNaming(true)} />
              {!!links?.length && <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />}
              {links?.map((link) => (
                // LinkItem stays open by default (built for full page loads); a
                // client navigation leaves the page behind, so close it.
                <Menu.LinkItem
                  key={link.href}
                  className={ITEM}
                  closeOnClick
                  render={<Link href={link.href} />}
                >
                  <MusicIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
                  <span className="min-w-0 truncate" title={link.label}>
                    {link.label}
                  </span>
                </Menu.LinkItem>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <NewPlaylistDialog
        open={naming}
        onOpenChange={setNaming}
        tracks={tracks}
        defaultName={item?.title ?? ''}
      />
    </>
  );
}
