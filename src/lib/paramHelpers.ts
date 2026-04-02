/**
 * Extract a string from a raw segment param value.
 * timber's getSegmentParams() returns Record<string, string | string[]>.
 * For single-segment params like [artistSlug], the value is always a string,
 * but TypeScript sees string | string[]. This helper narrows the type.
 */
export function paramAsString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Same as paramAsString but asserts non-undefined. */
export function requireParam(value: string | string[] | undefined): string {
  const s = paramAsString(value);
  if (s === undefined) throw new Error('Required param is missing');
  return s;
}
