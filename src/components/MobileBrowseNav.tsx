'use client';

import { Link, useSelectedLayoutSegments } from '@timber-js/app/client';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { ChevronLeft } from 'lucide-react';

const COLUMN_SEGMENT_COUNTS = [0, 1, 2, 4];

function getActiveColumn(segments: string[], hasSlug: boolean): number {
  const depth = segments.length;
  if (depth <= 0) return 0;
  if (depth === 1) return 1;
  if (depth === 2 && isQuickHitSegment(segments[1]) && !hasSlug) return 1;
  if (depth <= 3) return 2;
  return 3;
}

function getBackPath(segments: string[], activeColumn: number, isQuickHitDrillDown: boolean): string {
  if (isQuickHitDrillDown) {
    return '/' + segments.slice(0, 2).join('/');
  }
  if (activeColumn <= 0) return '/';
  const prevSegmentCount = COLUMN_SEGMENT_COUNTS[activeColumn - 1];
  return '/' + segments.slice(0, prevSegmentCount).join('/') || '/';
}

function getBackLabel(segments: string[], activeColumn: number, isQuickHitDrillDown: boolean): string {
  if (isQuickHitDrillDown) {
    return segments[1]?.replaceAll('-', ' ') ?? 'Back';
  }
  if (activeColumn <= 1) return 'Home';
  const prevSegmentCount = COLUMN_SEGMENT_COUNTS[activeColumn - 1];
  const label = segments[prevSegmentCount - 1];
  return label?.replaceAll('-', ' ') ?? 'Back';
}

function getCurrentHeading(segments: string[], activeColumn: number, isQuickHitDrillDown: boolean): string {
  if (isQuickHitDrillDown) {
    return segments[1]?.replaceAll('-', ' ') ?? '';
  }
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
  const [{ slug }] = slugSearchParams.useQueryStates();
  const hasSlug = !!slug;
  const activeColumn = getActiveColumn(segments, hasSlug);
  const isQuickHitDrillDown = segments.length === 2 && isQuickHitSegment(segments[1]) && hasSlug;

  if (activeColumn === 0) return null;

  const backPath = getBackPath(segments, activeColumn, isQuickHitDrillDown);
  const backLabel = getBackLabel(segments, activeColumn, isQuickHitDrillDown);
  const heading = getCurrentHeading(segments, activeColumn, isQuickHitDrillDown);

  return (
    <div className="flex min-h-[36px] items-center border-b border-hairline bg-surface-raised px-2 text-sm lg:hidden">
      <Link href={backPath} className="flex shrink-0 items-center gap-0.5 text-accent">
        <ChevronLeft className="size-4" />
        <span className="capitalize">{backLabel}</span>
      </Link>
      {heading && (
        <span className="flex-1 truncate text-center text-sm font-medium text-text-primary capitalize">
          {heading}
        </span>
      )}
    </div>
  );
}
