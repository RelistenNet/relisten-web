'use client';

import { Link, useSelectedLayoutSegments } from '@timber-js/app/client';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { ChevronLeft } from 'lucide-react';

const COLUMN_SEGMENT_COUNTS = [0, 1, 2, 4];

function getActiveColumn(segments: string[], hasSlug: boolean, hasDate: boolean): number {
  const depth = segments.length;
  if (depth <= 0) return 0;
  if (depth === 1) return 1;
  if (depth === 2 && isQuickHitSegment(segments[1])) {
    if (hasDate) return 3;
    if (hasSlug) return 2;
    return 1;
  }
  if (depth <= 3) return 2;
  return 3;
}

function getBackPath(
  segments: string[],
  activeColumn: number,
  hasSlug: boolean,
  slug: string | undefined
): string {
  const isQuickHit = segments.length >= 2 && isQuickHitSegment(segments[1]);

  if (isQuickHit) {
    if (activeColumn === 3 && hasSlug) {
      return slugSearchParams.href('/' + segments.slice(0, 2).join('/'), { slug });
    }
    if (activeColumn === 3 || activeColumn === 2) {
      return '/' + segments.slice(0, 2).join('/');
    }
    return '/' + segments[0];
  }

  if (activeColumn <= 0) return '/';
  const prevSegmentCount = COLUMN_SEGMENT_COUNTS[activeColumn - 1];
  return '/' + segments.slice(0, prevSegmentCount).join('/') || '/';
}

function getBackLabel(
  segments: string[],
  activeColumn: number
): string {
  const isQuickHit = segments.length >= 2 && isQuickHitSegment(segments[1]);

  if (isQuickHit && activeColumn >= 2) {
    return segments[1]?.replaceAll('-', ' ') ?? 'Back';
  }

  if (activeColumn <= 1) return 'Home';
  const prevSegmentCount = COLUMN_SEGMENT_COUNTS[activeColumn - 1];
  const label = segments[prevSegmentCount - 1];
  return label?.replaceAll('-', ' ') ?? 'Back';
}

function getCurrentHeading(
  segments: string[],
  activeColumn: number,
  hasSlug: boolean,
  hasDate: boolean,
  date: string | undefined
): string {
  const isQuickHit = segments.length >= 2 && isQuickHitSegment(segments[1]);

  if (isQuickHit && hasDate && date) {
    const [, m, d] = date.split('-');
    return m && d ? `${m}/${d}` : date;
  }

  if (isQuickHit && hasSlug) {
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
  const [{ slug, date }] = slugSearchParams.useQueryStates();
  const hasSlug = !!slug;
  const hasDate = !!date;
  const activeColumn = getActiveColumn(segments, hasSlug, hasDate);

  if (activeColumn === 0) return null;

  const backPath = getBackPath(segments, activeColumn, hasSlug, slug);
  const backLabel = getBackLabel(segments, activeColumn);
  const heading = getCurrentHeading(segments, activeColumn, hasSlug, hasDate, date);

  return (
    <div className="sticky top-[50px] z-10 grid min-h-[36px] grid-cols-[1fr_auto_1fr] items-center border-b border-hairline bg-surface-raised px-2 text-sm lg:hidden">
      <Link href={backPath} className="flex items-center gap-0.5 text-accent justify-self-start">
        <ChevronLeft className="size-4" />
        <span className="capitalize">{backLabel}</span>
      </Link>
      {heading && (
        <span className="truncate text-sm font-medium text-text-primary capitalize">{heading}</span>
      )}
    </div>
  );
}
