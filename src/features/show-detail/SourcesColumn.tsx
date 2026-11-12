'use client';

import { href } from '@timber-js/app/routes';
import type { Source } from '@/domain/types';
import TapesColumn from '@/ui/shows/TapesColumn';
import { sourceQuery } from '@/lib/searchParams/sourceSearchParam';
import { splitShowDate } from '@/lib/utils';

// The show page's tape switcher: the browse view's sources column, whose rows
// here link back to this page with the chosen `?source=`.

export default function SourcesColumn({
  artistSlug,
  showDate,
  sources,
}: {
  artistSlug: string;
  showDate: string;
  /** The show's tapes, without their tracks: the cards don't show them. */
  sources: Source[];
}) {
  const { year, month, day } = splitShowDate(showDate);

  return (
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
  );
}
