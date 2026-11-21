'use server';

import { z } from 'zod/v4';
import { getArtistDirectory } from '@/data/artists';
import { showByDate } from '@/data/shows';
import { songDetail } from '@/data/songs';
import { fromSourceParam } from '@/lib/sourceParam';

// Add Tracks in the editor (RE-54): a song's performances, and the tracks a
// pasted Relisten link points at. Server actions, since the catalog is read on
// the server (src/data); each returns only what the picker shows.

/** One track to offer. */
export type TrackChoice = {
  trackId: string;
  title: string;
  artistName: string;
  /** YYYY-MM-DD */
  date: string;
  venue?: string;
  /** Seconds. */
  duration?: number;
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A song's performances can run to thousands; the newest this many are offered. */
const MAX_PERFORMANCES = 500;

const SongInput = z.object({
  artistSlug: z.string().regex(SLUG),
  songSlug: z.string().regex(SLUG),
});

/** A song's performances that have a playable track, newest first. Null if it isn't found. */
export async function songPerformances(input: unknown): Promise<TrackChoice[] | null> {
  const parsed = SongInput.safeParse(input);
  if (!parsed.success) return null;
  const { artistSlug, songSlug } = parsed.data;
  try {
    const [song, directory] = await Promise.all([
      songDetail(artistSlug, songSlug),
      getArtistDirectory(),
    ]);
    return song.performances
      .flatMap((p) => (p.track ? [{ ...p, track: p.track }] : []))
      .sort((a, b) => b.show.date.localeCompare(a.show.date))
      .slice(0, MAX_PERFORMANCES)
      .map((p) => ({
        trackId: p.track.id,
        title: p.track.title ?? song.name,
        artistName: directory.byId.get(p.show.artistId)?.name ?? '',
        date: p.show.date,
        venue: p.show.venue?.name,
        duration: p.duration ?? p.track.duration ?? undefined,
      }));
  } catch {
    // Unknown artist or song (the data layer denies a 404), or the API failing.
    return null;
  }
}

/**
 * A pasted Relisten link: a show page (its tape, as `?source=` names it or the
 * first) or an old-style track link (that one track). Null for anything else.
 */
export async function tracksAtUrl(
  input: unknown
): Promise<{ label: string; tracks: TrackChoice[] } | null> {
  const parsed = z.string().max(2000).safeParse(input);
  if (!parsed.success) return null;
  let url: URL;
  try {
    url = new URL(parsed.data.trim(), 'https://relisten.net');
  } catch {
    return null;
  }
  const parts = url.pathname.split('/').filter(Boolean);
  // /artists/<artist>/shows/<date>, or /<artist>/<yyyy>/<mm>/<dd>[/<song>]
  const target =
    parts[0] === 'artists' && parts[2] === 'shows' && parts.length === 4
      ? { artistSlug: parts[1], date: parts[3] }
      : parts.length === 4 || parts.length === 5
        ? { artistSlug: parts[0], date: `${parts[1]}-${parts[2]}-${parts[3]}`, songSlug: parts[4] }
        : null;
  if (!target || !SLUG.test(target.artistSlug) || !DATE.test(target.date)) return null;
  if (target.songSlug !== undefined && !SLUG.test(target.songSlug)) return null;

  try {
    const directory = await getArtistDirectory();
    const artist = [...directory.byId.values()].find((a) => a.slug === target.artistSlug);
    if (!artist) return null;
    const show = await showByDate.get(artist.id, target.date);
    const sourceId = fromSourceParam(url.searchParams.get('source'));
    const source = show.sources.find((s) => s.id === sourceId) ?? show.sources[0];
    if (!source) return null;
    const all = source.sets.flatMap((set) => set.tracks);
    const tracks = target.songSlug ? all.filter((t) => t.slug === target.songSlug) : all;
    if (!tracks.length) return null;
    const choice = (t: (typeof all)[number]): TrackChoice => ({
      trackId: t.id,
      title: t.title ?? 'Track',
      artistName: artist.name,
      date: show.date,
      venue: show.venue?.name,
      duration: t.duration,
    });
    return {
      label: target.songSlug
        ? `${tracks[0].title ?? 'Track'}, ${show.date}`
        : `${artist.name}, ${show.date} (${tracks.length} tracks)`,
      tracks: tracks.map(choice),
    };
  } catch {
    return null;
  }
}
