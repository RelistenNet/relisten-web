export const QUICK_HIT_SEGMENTS = new Set([
  'recently-added',
  'top',
  'venues',
  'songs',
  'tours',
]);

export function isQuickHitSegment(segment: string | undefined): segment is string {
  return !!segment && QUICK_HIT_SEGMENTS.has(segment);
}
