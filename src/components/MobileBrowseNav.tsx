'use client';

import { Link, usePathname } from '@timber-js/app/client';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { ChevronLeft } from 'lucide-react';
import { useSyncExternalStore } from 'react';

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

const subscribe = (cb: () => void) => {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
};
const getSnapshot = () => window.location.search;
const getServerSnapshot = () => '';

export default function MobileBrowseNav() {
  const pathname = usePathname();
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const segments = pathname.split('/').filter(Boolean);
  const hasSlug = search.includes('slug=');
  const activeColumn = getActiveColumn(segments, hasSlug);
  const isQuickHitDrillDown = segments.length === 2 && isQuickHitSegment(segments[1]) && hasSlug;

  if (activeColumn === 0) return null;

  const backPath = getBackPath(segments, activeColumn, isQuickHitDrillDown);
  const backLabel = getBackLabel(segments, activeColumn, isQuickHitDrillDown);

  return (
    <div className="flex min-h-[40px] items-center gap-1 border-b border-hairline bg-surface-raised px-2 text-sm lg:hidden">
      <Link href={backPath} className="flex items-center gap-0.5 text-accent">
        <ChevronLeft className="size-4" />
        <span className="capitalize">{backLabel}</span>
      </Link>
    </div>
  );
}
