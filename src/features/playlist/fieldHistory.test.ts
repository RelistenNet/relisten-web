import { describe, expect, it } from 'vitest';
import { record, redo, startHistory, TYPING_GROUP_MS, undo } from './fieldHistory';

const s = (value: string) => ({ value, start: value.length, end: value.length });

describe('fieldHistory', () => {
  it('groups a run of typing into one step', () => {
    let h = startHistory(s(''));
    h = record(h, s('a'), { typed: true, now: 0 });
    h = record(h, s('ab'), { typed: true, now: 100 });
    h = record(h, s('abc'), { typed: true, now: 200 });
    h = undo(h);
    expect(h.present.value).toBe('');
  });

  it('starts a new step after a pause, and for each edit made in script', () => {
    let h = startHistory(s(''));
    h = record(h, s('jam'), { typed: true, now: 0 });
    h = record(h, s('jam!'), { typed: true, now: TYPING_GROUP_MS + 1 });
    h = record(h, s('**jam!**'), { typed: false, now: TYPING_GROUP_MS + 2 });
    h = record(h, s('**jam!** x'), { typed: true, now: TYPING_GROUP_MS + 3 });
    expect([undo(h), undo(undo(h)), undo(undo(undo(h)))].map((x) => x.present.value)).toEqual([
      '**jam!**',
      'jam!',
      'jam',
    ]);
  });

  it('redoes what was undone, until something new is recorded', () => {
    let h = startHistory(s('a'));
    h = record(h, s('**a**'), { typed: false, now: 0 });
    h = undo(h);
    expect(redo(h).present.value).toBe('**a**');
    h = record(h, s('ab'), { typed: true, now: 1 });
    expect(redo(h).present.value).toBe('ab');
  });

  it('does nothing at either end', () => {
    const h = startHistory(s('a'));
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });
});
