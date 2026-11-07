import { describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { playerMachine } from './player.machine';
import { compose, emptyQueue, type QueueContext, type QueueItem } from './queue/model';

const item = (key: string, trackId = key): QueueItem => ({
  key,
  trackId,
  sourceId: 'src',
  showId: 'show',
  artistSlug: 'grateful-dead',
  artistName: 'Grateful Dead',
  date: '1977-05-08',
  trackSlug: trackId,
  title: trackId,
});

const show = (showId: string, n: number, prefix: string): QueueContext => ({
  ref: { kind: 'show', showId, sourceId: 'src' },
  label: showId,
  items: Array.from({ length: n }, (_, i) => item(`${prefix}${i + 1}`, `${showId}-t${i + 1}`)),
});

const start = () => {
  const actor = createActor(playerMachine);
  actor.start();
  return {
    actor,
    state: () => actor.getSnapshot().value,
    keys: () => compose(actor.getSnapshot().context.queue).map((i) => i.key),
    queue: () => actor.getSnapshot().context.queue,
  };
};

describe('playerMachine lifecycle', () => {
  it('boots, then HYDRATE restores the saved queue and becomes ready', () => {
    const p = start();
    expect(p.state()).toBe('booting');
    const saved = { ...emptyQueue, context: show('s1', 3, 'a') };
    p.actor.send({ type: 'HYDRATE', saved });
    expect(p.state()).toBe('ready');
    expect(p.keys()).toEqual(['a1', 'a2', 'a3']);
  });

  it('HYDRATE with nothing saved still becomes ready', () => {
    const p = start();
    p.actor.send({ type: 'HYDRATE', saved: null });
    expect(p.state()).toBe('ready');
    expect(p.queue()).toEqual(emptyQueue);
  });

  it('a page that plays before hydration keeps its show; the saved Next up carries over', () => {
    // React runs a child's effects (PlayerManager) before its parent's (Providers).
    const p = start();
    p.actor.send({ type: 'PLAY_CONTEXT', ctx: show('page', 3, 'p'), startKey: 'p2' });

    const saved = createActor(playerMachine);
    saved.start();
    saved.send({ type: 'HYDRATE', saved: null });
    saved.send({ type: 'PLAY_CONTEXT', ctx: show('old', 2, 'o'), startKey: 'o1' });
    saved.send({ type: 'ADD_TO_QUEUE', items: [item('n1')] });
    saved.send({ type: 'SET_REPEAT', repeat: 'all' });

    p.actor.send({ type: 'HYDRATE', saved: saved.getSnapshot().context.queue });
    expect(p.state()).toBe('ready');
    expect(p.queue().current?.key).toBe('p2');
    expect(p.keys()).toEqual(['p1', 'p2', 'n1', 'p3']);
    expect(p.queue().repeat).toBe('all');
  });

  it('HYDRATE is ignored once ready (a second effect run)', () => {
    const p = start();
    p.actor.send({ type: 'HYDRATE', saved: null });
    p.actor.send({ type: 'PLAY_CONTEXT', ctx: show('s1', 2, 'a'), startKey: 'a1' });
    p.actor.send({ type: 'HYDRATE', saved: { ...emptyQueue, context: show('s2', 2, 'b') } });
    expect(p.keys()).toEqual(['a1', 'a2']);
  });
});

describe('playerMachine edits', () => {
  it('records gapless advancing, and drops played Next up', () => {
    const p = start();
    p.actor.send({ type: 'HYDRATE', saved: null });
    p.actor.send({ type: 'PLAY_CONTEXT', ctx: show('s1', 3, 'a'), startKey: 'a1' });
    p.actor.send({ type: 'PLAY_NEXT', items: [item('n1')] });
    p.actor.send({ type: 'ADVANCED', key: 'n1' });
    p.actor.send({ type: 'ADVANCED', key: 'a2' });
    expect(p.keys()).toEqual(['a1', 'a2', 'a3']);
    expect(p.queue().current?.key).toBe('a2');
  });

  it('survives a model error, keeping the queue', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const p = start();
    p.actor.send({ type: 'HYDRATE', saved: null });
    p.actor.send({ type: 'PLAY_CONTEXT', ctx: show('s1', 2, 'a'), startKey: 'a1' });
    p.actor.send({ type: 'ADD_TO_QUEUE', items: [item('a2')] }); // duplicate key
    expect(error).toHaveBeenCalled();
    expect(p.actor.getSnapshot().status).toBe('active');
    expect(p.keys()).toEqual(['a1', 'a2']);
    p.actor.send({ type: 'ADD_TO_QUEUE', items: [item('n1')] });
    expect(p.keys()).toEqual(['a1', 'n1', 'a2']);
    error.mockRestore();
  });
});

describe('playerMachine embeds', () => {
  it('plays one show and ignores Next up and shuffle', () => {
    const p = start();
    p.actor.send({ type: 'EMBED' });
    p.actor.send({ type: 'PLAY_CONTEXT', ctx: show('s1', 3, 'a'), startKey: 'a2' });
    p.actor.send({ type: 'ADD_TO_QUEUE', items: [item('n1')] });
    p.actor.send({ type: 'SET_SHUFFLE', seed: 4 });
    p.actor.send({ type: 'HYDRATE', saved: { ...emptyQueue, context: show('s2', 1, 'b') } });
    expect(p.state()).toBe('ephemeral');
    expect(p.keys()).toEqual(['a1', 'a2', 'a3']);
    expect(p.queue().shuffle).toBeNull();
  });
});
