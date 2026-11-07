'use client';

import { Link, useSelectedLayoutSegments } from '@timber-js/app/client';
import { ChevronLeft } from 'lucide-react';

const COLUMN_SEGMENT_COUNTS = [0, 1, 2, 4];

/** Which column the URL puts in front: artists, years, shows, or a show. */
function getActiveColumn(segments: string[]): number {
  const depth = segments.length;
  if (depth <= 0) return 0;
  if (depth === 1) return 1;
  if (depth <= 3) return 2;
  return 3;
}

function getBackPath(segments: string[], activeColumn: number): string {
  if (activeColumn <= 0) return '/';
  const prevSegmentCount = COLUMN_SEGMENT_COUNTS[activeColumn - 1];
  return '/' + segments.slice(0, prevSegmentCount).join('/') || '/';
}

function getBackLabel(segments: string[], activeColumn: number): string {
  if (activeColumn <= 1) return 'Home';
  const prevSegmentCount = COLUMN_SEGMENT_COUNTS[activeColumn - 1];
  const label = segments[prevSegmentCount - 1];
  return label?.replaceAll('-', ' ') ?? 'Back';
}

function getCurrentHeading(segments: string[], activeColumn: number): string {
  if (activeColumn === 3 && segments.length >= 4) {
    const [, , month, day] = segments;
    return `${month}/${day}`;
  }
  const segCount = COLUMN_SEGMENT_COUNTS[activeColumn];
  if (segCount === undefined) return segments[segments.length - 1]?.replaceAll('-', ' ') ?? '';
  const label = segments[segCount - 1];
  return label?.replaceAll('-', ' ') ?? '';
}

export default function MobileBrowseNav() {
  const segments = useSelectedLayoutSegments();
  const activeColumn = getActiveColumn(segments);

  if (activeColumn === 0) return null;

  const backPath = getBackPath(segments, activeColumn);
  const backLabel = getBackLabel(segments, activeColumn);
  const heading = getCurrentHeading(segments, activeColumn);

  return (
    <div
      className="
      sticky top-[50px] z-10 grid min-h-[36px] grid-cols-[1fr_auto_1fr] items-center border-b
      border-hairline bg-surface-raised px-2 text-sm lg:hidden
    "
    >
      <Link href={backPath} className="flex items-center gap-0.5 justify-self-start text-accent">
        <ChevronLeft className="size-4" />
        <span className="capitalize">{backLabel}</span>
      </Link>
      {heading && (
        <span className="truncate text-sm font-medium text-text-primary capitalize">{heading}</span>
      )}
    </div>
  );
}
