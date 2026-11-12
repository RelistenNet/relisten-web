'use client';

import { href } from '@timber-js/app/routes';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Source } from '@/domain/types';
import TapesColumn from '@/ui/shows/TapesColumn';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { splitShowDate } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';

// The show page's tape switcher: opens the browse view's sources column, whose
// rows here link back to this page with the chosen `?source=`. The popover
// mounts the list only while open, so the active tape scrolls into view each time.

export default function SourcePicker({
  artistSlug,
  showDate,
  sources,
}: {
  artistSlug: string;
  showDate: string;
  /** The show's tapes, without their tracks: the cards don't show them. */
  sources: Source[];
}) {
  const [open, setOpen] = useState(false);
  const { year, month, day } = splitShowDate(showDate);

  return (
    <Popover open={open} onOpenChange={setOpen} align="start" sideOffset={6}>
      <PopoverTrigger className="inline-flex cursor-pointer items-center gap-1 hover:text-accent">
        View Sources
        <ChevronDown className="size-3.5 shrink-0" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        // Same firmer edge and deeper shadow as the artist picker: it opens over the track table.
        className="
          max-h-[min(70vh,640px)] w-[min(380px,calc(100vw-1rem))] overflow-x-hidden overflow-y-auto
          p-0 shadow-2xl ring-2 shadow-black/25 ring-text-primary/15 dark:shadow-black/60
        "
        onClick={(e) => (e.target as Element).closest('a[href]') && setOpen(false)}
      >
        <TapesColumn
          artistSlug={artistSlug}
          year={year}
          month={month}
          day={day}
          show={{ sources }}
          hrefFor={(source) =>
            href(
              '/artists/[artistSlug]/shows/[showDate]',
              { artistSlug, showDate },
              sourceQuery(source.id)
            )
          }
        />
      </PopoverContent>
    </Popover>
  );
}
