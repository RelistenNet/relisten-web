import 'server-only';

import { unwrap } from '@/api/fetcher';
import { getApiV4LiveHistory, getApiV4LiveSummary } from '@/api/generated/client';
import { toMonthDay, type ApiLiveSummary, type LivePlay, type MonthDay } from '@/lib/live';
import { toSourceParam } from '@/lib/sourceParam';
import { showVenue } from './adapters';
import { getArtistDirectory } from './artists';
import { defineResource } from './resource';

// Live listening. Short TTLs; failures throw rather than return a fallback, so a
// failure is never cached and the last good entry keeps serving while it retries.

/** How many recent plays the server keeps for the feed; clients filter by sequence. */
const LIVE_HISTORY_BUFFER = 200;

type Play = Omit<LivePlay, 'artistName' | 'artistSlug'> & { artistId: string };

const history = defineResource({
  name: 'live-history',
  ttl: 3,
  load: () => unwrap(getApiV4LiveHistory({ limit: LIVE_HISTORY_BUFFER })),
  slim: (items): Play[] =>
    items.flatMap((item) =>
      item.show.display_date
        ? [
            {
              id: item.sequence,
              playedAt: Date.parse(item.played_at),
              trackTitle: item.track.title ?? '',
              trackSlug: item.track.slug ?? '',
              sourceParam: toSourceParam(item.track.source_id),
              displayDate: item.show.display_date,
              artistId: item.show.artist_id,
            },
          ]
        : []
    ),
});

type SummaryArtist = Omit<ApiLiveSummary['artists'][number], 'name' | 'slug'>;

// The summary's window advances once a minute (the API aligns it to whole
// minutes), so refetching more often than every 30s buys nothing.
const summary = defineResource({
  name: 'live-summary',
  ttl: 30,
  // Only the artists list is used: ask for every artist and as few show rows as allowed.
  load: (monthDay: string) =>
    unwrap(
      getApiV4LiveSummary({
        minutes: 15,
        sort: 'plays',
        artists_limit: 100,
        shows_limit: 1,
        max_per_artist: 1,
        month_day: monthDay,
      })
    ),
  slim: (s) => ({
    window_minutes: s.window_minutes,
    listened_seconds: s.listened_seconds,
    artists: (s.artists ?? []).map((a): SummaryArtist => ({
      artist_id: a.artist_id,
      listened_seconds: a.listened_seconds,
      show_count: a.show_count,
      top_show: a.top_show?.show.display_date
        ? {
            listened_seconds: a.top_show.listened_seconds,
            display_date: a.top_show.show.display_date,
            venue_name: showVenue(a.top_show.show)?.name,
            source_param: toSourceParam(a.top_show.source.id),
          }
        : null,
    })),
  }),
});

/** The live summary joined with artist names. Null when the API is unavailable. */
export async function liveSummary(today: MonthDay): Promise<ApiLiveSummary | null> {
  try {
    const [s, directory] = await Promise.all([
      summary.get(toMonthDay(today)),
      getArtistDirectory(),
    ]);
    return {
      ...s,
      artists: s.artists.flatMap((a) => {
        const artist = directory.byId.get(a.artist_id);
        return artist ? [{ ...a, name: artist.name, slug: artist.slug }] : [];
      }),
    };
  } catch (err) {
    console.error('Live summary unavailable', err);
    return null;
  }
}

/**
 * Recent plays, newest first, after `afterSequence`. Every caller shares one
 * cached upstream read, however many browsers poll. Empty when the API is down.
 */
export async function livePlays(afterSequence = 0, limit = 30): Promise<LivePlay[]> {
  try {
    const [plays, directory] = await Promise.all([history.get(), getArtistDirectory()]);
    return plays
      .filter((p) => p.id > afterSequence)
      .flatMap(({ artistId, ...play }) => {
        const artist = directory.byId.get(artistId);
        return artist ? [{ ...play, artistName: artist.name, artistSlug: artist.slug }] : [];
      })
      .slice(0, limit);
  } catch (err) {
    console.error('Live history unavailable', err);
    return [];
  }
}
