'use client';

import { Menu } from '@base-ui/react/menu';
import { Link } from '@timber-js/app/client';
import { EllipsisVerticalIcon, ListEndIcon, ListStartIcon, MusicIcon } from 'lucide-react';
import cn from '@/lib/cn';
import { addToQueue, playNext } from './commands';
import type { QueueItem } from './queue/model';

const ITEM = `
  flex cursor-default items-center gap-2 rounded-md py-2.5 pr-3 pl-2.5 text-base outline-none
  select-none data-highlighted:bg-surface-hover sm:py-1.5 sm:pr-2.5 sm:pl-2 sm:text-sm
`;

/** A page the menu links to, below the queue actions. */
export type QueueMenuLink = { label: string; href: string };

/** A track's "⋯" menu: Play next, Add to queue, then any links (its songs' pages). */
export default function QueueMenu({
  item,
  links,
  className,
}: {
  item: QueueItem | null;
  links?: QueueMenuLink[];
  className?: string;
}) {
  if (!item) return null;
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`More for ${item.title}`}
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
          <Menu.Popup
            className="
              min-w-44 origin-(--transform-origin) rounded-lg bg-surface-raised p-1
              text-text-primary shadow-lg ring-1 ring-hairline transition-[transform,opacity]
              outline-none data-ending-style:scale-95 data-ending-style:opacity-0
              data-starting-style:scale-95 data-starting-style:opacity-0 dark:shadow-none
            "
          >
            <Menu.Item className={ITEM} onClick={() => playNext([item])}>
              <ListStartIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
              Play next
            </Menu.Item>
            <Menu.Item className={ITEM} onClick={() => addToQueue([item])}>
              <ListEndIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
              Add to queue
            </Menu.Item>
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
                {link.label}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
