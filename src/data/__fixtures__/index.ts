// Saved v4 API responses, trimmed, for unit tests (no network in tests).
import type { ShowResource, SongWithShowsResource } from '@/api/generated/model';
import gdShow from './show-gd-1977-05-08.json';
import tweezerReprise from './song-phish-tweezer-reprise.json';

/** GET /artists/{gd}/shows/by-date/1977-05-08, trimmed to two tapes of two tracks. */
export const gd770508 = gdShow as unknown as ShowResource;

/**
 * GET /artists/{phish}/songs/by-slug/tweezer-reprise?include_tracks=top, trimmed to four shows:
 *   1991-02-01  played once
 *   1999-12-08  twice: "YEM > Tweezer Reprise", then on its own
 *   2016-12-28  only inside "Martian Monster > Tweezer Reprise Jam > Martian Monster"
 *   2025-07-27  six times on one tape (SPAC)
 */
export const tweezerRepriseSong = tweezerReprise as unknown as SongWithShowsResource;

/** The value, or a thrown error naming what was missing. */
export function must<T>(value: T | null | undefined, what = 'value'): T {
  if (value == null) throw new Error(`fixture is missing ${what}`);
  return value;
}
