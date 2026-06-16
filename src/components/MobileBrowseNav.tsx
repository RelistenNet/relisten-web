'use client';

import { Link, usePathname } from '@timber-js/app/client';
import { ChevronLeft } from 'lucide-react';

// Maps column index to how many URL segments that level uses.
// Column 0 (artists): 0 segments (/)
// Column 1 (years):   1 segment  (/artist)
// Column 2 (shows):   2 segments (/artist/year)
// Column 3 (songs):   4 segments (/artist/year/month/day)
const COLUMN_SEGMENT_COUNTS = [0, 1, 2, 4];

function getActiveColumn(segmentCount: number): number {
  if (segmentCount <= 0) return 0;
  if (segmentCount === 1) return 1;
  if (segmentCount <= 3) return 2;
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

export default function MobileBrowseNav() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const activeColumn = getActiveColumn(segments.length);

  if (activeColumn === 0) return null;

  const backPath = getBackPath(segments, activeColumn);
  const backLabel = getBackLabel(segments, activeColumn);

  return (
    <div className="flex min-h-[40px] items-center gap-1 border-b border-hairline bg-surface-raised px-2 text-sm lg:hidden">
      <Link href={backPath} className="flex items-center gap-0.5 text-accent">
        <ChevronLeft className="size-4" />
        <span className="capitalize">{backLabel}</span>
      </Link>
    </div>
  );
}
