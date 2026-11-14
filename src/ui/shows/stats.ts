import { format, formatDistanceToNowStrict } from 'date-fns';
import type { ShowRow } from './rows';

// Summary numbers for a detail page header, from its full (unfiltered) rows.

/** "Jun 6, 1997" from "1997-06-06", without timezone shifts. */
export const formatShowDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'MMM d, yyyy');
};

export const timeAgo = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return formatDistanceToNowStrict(new Date(y, m - 1, d), { addSuffix: true });
};

/** "12%", or "<1%" for a share too small to round up to 1. */
export const formatShare = (part: number, whole: number) => {
  const pct = (part / whole) * 100;
  return pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
};

export function showStats(rows: ShowRow[]) {
  const byDate = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const byYear = new Map<string, number>();
  for (const r of rows) byYear.set(r.year, (byYear.get(r.year) ?? 0) + 1);

  // Lengths from multi-song files ("~") overstate the song, so leave them out.
  const timed = rows.flatMap((row) =>
    row.songDuration && !row.songDurationApprox ? [{ row, length: row.songDuration }] : []
  );
  const lengths = timed.map((t) => t.length).sort((a, b) => a - b);
  const mid = Math.floor(lengths.length / 2);
  const medianLength = lengths.length
    ? lengths.length % 2
      ? lengths[mid]
      : (lengths[mid - 1] + lengths[mid]) / 2
    : null;
  const longest = timed.reduce<(typeof timed)[number] | null>(
    (best, t) => (!best || t.length > best.length ? t : best),
    null
  )?.row;

  return {
    first: byDate[0],
    last: byDate[byDate.length - 1],
    byYear,
    medianLength,
    longest,
    shows: new Set(rows.map((r) => r.showId)).size,
  };
}
