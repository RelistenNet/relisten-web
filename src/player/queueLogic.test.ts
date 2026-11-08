import { describe, expect, it } from 'vitest';
import { emptyQueue, type QueueContext, type QueueItem } from './queue/model';
import { initialPlayer, playerTransition, type PlayerEvent, type PlayerState } from './queueLogic';

const item = (key: string): QueueItem => ({
  key,
  trackId: key,
  sourceId: 'src',
  showId: 'show',
  artistSlug: 'gd',
  artistName: 'GD',
  date: '1977-05-08',
  trackSlug: key,
  title: key,
  mp3Url: `https://archive.org/${key}.mp3`,
});
const ctx = (...keys: string[]): QueueContext => ({ label: 'x', items: keys.map(item) });
const run = (...events: PlayerEvent[]): PlayerState =>
  events.reduce(playerTransition, initialPlayer);

const saved = { ...emptyQueue, context: ctx('s1', 's2'), current: null, cursor: null };

describe('playerTransition', () => {
  it('restores the saved queue on hydrate, and becomes ready', () => {
    const s = run({ type: 'HYDRATE', saved });
    expect(s).toEqual({ mode: 'ready', queue: saved });
  });

  it('keeps what the page started while booting, and drops the saved queue', () => {
    const s = run(
      { type: 'PLAY_CONTEXT', ctx: ctx('p1', 'p2'), startKey: 'p2' },
      { type: 'HYDRATE', saved }
    );
    expect(s.mode).toBe('ready');
    expect(s.queue.current?.key).toBe('p2');
    expect(s.queue.context?.items.map((i) => i.key)).toEqual(['p1', 'p2']);
  });

  it('hydrates once', () => {
    const s = run({ type: 'HYDRATE', saved: null }, { type: 'HYDRATE', saved });
    expect(s.queue).toBe(emptyQueue);
  });

  it('embeds never restore', () => {
    const s = run({ type: 'EMBED' }, { type: 'HYDRATE', saved });
    expect(s).toEqual({ mode: 'embed', queue: emptyQueue });
  });

  it('keeps its identity for an edit that changes nothing', () => {
    const s = run({ type: 'PLAY_CONTEXT', ctx: ctx('a', 'b'), startKey: 'a' });
    expect(playerTransition(s, { type: 'GOTO', key: 'a' })).toBe(s);
  });
});

describe('Next up events', () => {
  const qi = (key: string) => ({
    key,
    trackId: key,
    sourceId: 's',
    showId: 'sh',
    artistSlug: 'gd',
    artistName: 'GD',
    date: '1977-05-08',
    trackSlug: key,
    title: key,
    mp3Url: `${key}.mp3`,
  });

  it('are ignored in embeds', () => {
    const embed = playerTransition(initialPlayer, { type: 'EMBED' });
    expect(playerTransition(embed, { type: 'ADD_TO_QUEUE', items: [qi('a')] })).toBe(embed);
    expect(playerTransition(embed, { type: 'PLAY_NEXT', items: [qi('a')] })).toBe(embed);
  });

  it('edit Next up when ready', () => {
    let s = playerTransition(initialPlayer, { type: 'HYDRATE', saved: null });
    s = playerTransition(s, { type: 'ADD_TO_QUEUE', items: [qi('a'), qi('b')] });
    s = playerTransition(s, { type: 'MOVE', key: 'b', after: null });
    s = playerTransition(s, { type: 'REMOVE', key: 'b' });
    expect(s.queue.current?.key).toBe('a');
    expect(s.queue.upNext).toEqual([]);
  });
});

it('ignores unknown events instead of losing the state', () => {
  const s = playerTransition(initialPlayer, { type: 'HYDRATE', saved: null });
  expect(playerTransition(s, { type: 'SET_REPEAT', repeat: 'all' } as unknown as PlayerEvent)).toBe(
    s
  );
});
