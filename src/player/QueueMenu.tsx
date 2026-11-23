'use client';

import { Link } from '@timber-js/app/client';
import { EllipsisVerticalIcon, ListEndIcon, ListStartIcon, MusicIcon } from 'lucide-react';
import { useState } from 'react';
import cn from '@/lib/cn';
import { toast } from 'sonner';
import { AddToPlaylistSubmenu, NewPlaylistDialog, type PlaylistTracks } from './AddToPlaylist';
import { addToQueue, playNext, queueShow, showTrackIds } from './commands';
import { useSongQueue } from './SongQueue';
import { TOASTER_ID } from './toasts';
import type { QueueTarget } from './QueueButtons';
import {
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '@/ui/base/Menu';

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
  // On a public playlist's page, what's queued counts for that playlist.
  const playlistId = useSongQueue()?.playlistId;
  const showId = 'showId' in target ? target.showId : null;
  // The New Playlist dialog outlives the menu, which closes when it's chosen.
  const [naming, setNaming] = useState(false);
  if (!item && !showId) return null;
  const name = givenName ?? item?.title ?? 'show';
  const tracks: PlaylistTracks = async () =>
    item ? { trackIds: [item.trackId] } : showId ? await showTrackIds(showId) : null;
  const run = (where: 'next' | 'end') => () => {
    if (item) (where === 'next' ? playNext : addToQueue)([item], playlistId);
    else if (showId)
      void queueShow(showId, where).then(
        (ok) => ok || toast.error("Couldn't load that show", { toasterId: TOASTER_ID })
      );
  };
  return (
    <>
      <MenuRoot>
        <MenuTrigger
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
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onClick={run('next')} icon={ListStartIcon}>
            Play Next
          </MenuItem>
          <MenuItem onClick={run('end')} icon={ListEndIcon}>
            Add to Queue
          </MenuItem>
          <AddToPlaylistSubmenu tracks={tracks} onNew={() => setNaming(true)} />
          {!!links?.length && <MenuSeparator />}
          {links?.map((link) => (
            // LinkItem stays open by default (built for full page loads); a
            // client navigation leaves the page behind, so close it.
            <MenuLinkItem key={link.href} render={<Link href={link.href} />} icon={MusicIcon}>
              <span className="min-w-0 truncate" title={link.label}>
                {link.label}
              </span>
            </MenuLinkItem>
          ))}
        </MenuContent>
      </MenuRoot>
      <NewPlaylistDialog
        open={naming}
        onOpenChange={setNaming}
        tracks={tracks}
        defaultName={item?.title ?? ''}
      />
    </>
  );
}
