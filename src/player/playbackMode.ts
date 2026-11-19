import { z } from 'zod/v4';
import { readStorage, writeStorage } from '@/lib/browserStorage';

/**
 * How the player plays. `auto`: gapless, preloading 2 tracks ahead. `preload-1`:
 * the same, preloading 1. `no-gapless`: HTML5 only, nothing preloaded. Phones use
 * HTML5 either way (their browsers suspend Web Audio in the background) unless
 * `forceGaplessOnMobile`.
 */
const PlaybackSettingsSchema = z.object({
  mode: z.enum(['auto', 'preload-1', 'no-gapless']).catch('auto'),
  forceGaplessOnMobile: z.boolean().catch(false),
});

export type PlaybackSettings = z.infer<typeof PlaybackSettingsSchema>;
export type PlaybackMode = PlaybackSettings['mode'];

const KEY = 'playbackSettings';

/**
 * The saved settings. Each field falls back to its default on its own, so one
 * stale or unknown value doesn't reset the rest; missing or unreadable storage
 * gives all defaults.
 */
export function savedPlaybackSettings(): PlaybackSettings {
  let raw: unknown = {};
  try {
    raw = JSON.parse(readStorage(KEY) ?? '{}');
  } catch {
    // Not JSON: defaults.
  }
  const parsed = PlaybackSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : PlaybackSettingsSchema.parse({});
}

export function savePlaybackSettings(settings: PlaybackSettings): void {
  writeStorage(KEY, JSON.stringify(settings));
}

let atLoad: PlaybackSettings | undefined;

/**
 * The settings this page's player runs with, read once: gapless fixes its playback
 * method when its queue is created, so a change applies on the next page load.
 */
export function playbackSettingsAtLoad(): PlaybackSettings {
  return (atLoad ??= savedPlaybackSettings());
}

/** A phone or tablet: touch first, no hover. Browser only. */
export function isMobileDevice(): boolean {
  return (
    window.matchMedia?.('(pointer: coarse)')?.matches ||
    (navigator.maxTouchPoints > 0 && window.matchMedia?.('(hover: none)')?.matches) ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

/** Whether to skip Web Audio: always for `no-gapless`, on phones unless forced. */
export function html5OnlyFor(settings: PlaybackSettings, mobile: boolean): boolean {
  return settings.mode === 'no-gapless' || (mobile && !settings.forceGaplessOnMobile);
}

/** Tracks to preload ahead once playing. */
export function preloadTracksFor(settings: PlaybackSettings): number {
  return settings.mode === 'no-gapless' ? 0 : settings.mode === 'preload-1' ? 1 : 2;
}
