import { describe, expect, it } from 'vitest';
import type { Source, Track } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import { showContext, songRowItem, withKeys } from './items';

const track = (n: number, extra: Partial<Track> = {}): Track => ({
  id: `track_${n}`,
  sourceId: 'source_1',
  title: `Song ${n}`,
  slug: `song-${n}`,
  duration: 300 + n,
  mp3Url: `https://archive.org/${n}.mp3`,
  flacUrl: null,
  position: n,
  ...extra,
});

const source = {
  id: 'source_1',
  sets: [
    { id: 's1', index: 0, tracks: [track(1), track(2)] },
    { id: 's2', index: 1, tracks: [track(3)] },
  ],
} as unknown as Source;

const show = { id: 'show_1', date: '1977-05-08', venue: { name: 'Barton Hall' } };

describe('showContext', () => {
  it('lists a tape’s tracks in set order, with a show ref and label', () => {
    const ctx = showContext({
      show,
      source,
      artistSlug: 'grateful-dead',
      artistName: 'Grateful Dead',
    });
    expect(ctx.ref).toEqual({ kind: 'show', showId: 'show_1', sourceId: 'source_1' });
    expect(ctx.label).toBe('Grateful Dead · 1977-05-08');
    expect(ctx.items.map((i) => i.trackId)).toEqual(['track_1', 'track_2', 'track_3']);
    expect(ctx.items[0]).toEqual({
      trackId: 'track_1',
      sourceId: 'source_1',
      showId: 'show_1',
      artistSlug: 'grateful-dead',
      artistName: 'Grateful Dead',
      date: '1977-05-08',
      trackSlug: 'song-1',
      title: 'Song 1',
      duration: 301,
      venue: 'Barton Hall',
    });
    expect(ctx.urls.track_2).toEqual({ mp3Url: 'https://archive.org/2.mp3', flacUrl: null });
  });

  it('can take just some tracks (the single-track embed)', () => {
    const ctx = showContext({
      show,
      source,
      artistSlug: 'gd',
      artistName: 'GD',
      trackSlugs: ['song-3', 'song-1'],
    });
    expect(ctx.items.map((i) => i.trackId)).toEqual(['track_1', 'track_3']);
  });

  it('keeps URLs out of the items (they are saved; URLs are not)', () => {
    const ctx = showContext({ show, source, artistSlug: 'gd', artistName: 'GD' });
    expect(JSON.stringify(ctx.items)).not.toContain('archive.org');
  });
});

describe('songRowItem', () => {
  it('builds an item from a song row’s performance, or null without a file', () => {
    const row = {
      showId: 'show_9',
      date: '1972-08-27',
      artistSlug: 'gd',
      artistName: 'Grateful Dead',
      venueName: 'Old Renaissance Faire Grounds',
      track: track(7, { title: 'Dark Star' }),
    } as unknown as ShowRow;
    expect(songRowItem(row)).toMatchObject({
      trackId: 'track_7',
      showId: 'show_9',
      title: 'Dark Star',
    });
    expect(songRowItem({ ...row, track: undefined })).toBeNull();
  });
});

describe('withKeys', () => {
  it('gives each item its own key, even for the same track', () => {
    const ctx = showContext({ show, source, artistSlug: 'gd', artistName: 'GD' });
    const items = withKeys([ctx.items[0], ctx.items[0]]);
    expect(items[0].key).not.toBe(items[1].key);
    expect(items[0].trackId).toBe(items[1].trackId);
  });
});
