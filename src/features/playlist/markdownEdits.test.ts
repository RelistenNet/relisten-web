import { describe, expect, it } from 'vitest';
import {
  characterCount,
  formatTimestamp,
  insertLink,
  insertTimestamp,
  parseTimestamp,
  pasteAsLink,
  type TextEdit,
  toggleWrap,
} from './markdownEdits';

/** Applies an edit, and marks the selection after it with [ and ] (| when empty). */
function apply(value: string, edit: TextEdit | null) {
  if (!edit) return null;
  const next = value.slice(0, edit.range.start) + edit.text + value.slice(edit.range.end);
  const { start, end } = edit.select;
  return start === end
    ? `${next.slice(0, start)}|${next.slice(start)}`
    : `${next.slice(0, start)}[${next.slice(start, end)}]${next.slice(end)}`;
}

/** Parses `a [b] c` into the text and the selection it marks (| for a caret). */
function at(marked: string) {
  const caret = marked.indexOf('|');
  if (caret >= 0) {
    const value = marked.replace('|', '');
    return { value, sel: { start: caret, end: caret } };
  }
  const start = marked.indexOf('[');
  const end = marked.indexOf(']') - 1;
  return { value: marked.replace('[', '').replace(']', ''), sel: { start, end } };
}

describe('toggleWrap', () => {
  it('wraps, and unwraps from inside or outside the markers', () => {
    const a = at('a [big] jam');
    expect(apply(a.value, toggleWrap(a.value, a.sel, '**'))).toBe('a **[big]** jam');
    const inside = at('a **[big]** jam');
    expect(apply(inside.value, toggleWrap(inside.value, inside.sel, '**'))).toBe('a [big] jam');
    const whole = at('a [**big**] jam');
    expect(apply(whole.value, toggleWrap(whole.value, whole.sel, '**'))).toBe('a [big] jam');
  });

  it('inserts an empty pair at a caret', () => {
    const c = at('a | jam');
    expect(apply(c.value, toggleWrap(c.value, c.sel, '*'))).toBe('a *|* jam');
  });

  it("doesn't take italic markers from bold", () => {
    const b = at('a **[big]** jam');
    expect(apply(b.value, toggleWrap(b.value, b.sel, '*'))).toBe('a ***[big]*** jam');
  });
});

describe('links', () => {
  it('wraps the selection and puts the cursor in the URL', () => {
    const a = at('see [Relisten] now');
    expect(apply(a.value, insertLink(a.value, a.sel))).toBe('see [Relisten](|) now');
  });

  it('turns a pasted https URL over a selection into a link', () => {
    const a = at('see [Relisten] now');
    expect(apply(a.value, pasteAsLink(a.value, a.sel, ' https://relisten.net '))).toBe(
      'see [Relisten](https://relisten.net)| now'
    );
    expect(pasteAsLink(a.value, a.sel, 'http://relisten.net')).toBeNull();
    expect(pasteAsLink(a.value, a.sel, 'just words')).toBeNull();
    const caret = at('see | now');
    expect(pasteAsLink(caret.value, caret.sel, 'https://relisten.net')).toBeNull();
  });
});

describe('timestamps', () => {
  it('formats and parses the link grammar', () => {
    expect(formatTimestamp(65)).toBe('1:05');
    expect(formatTimestamp(3723)).toBe('1:02:03');
    expect(parseTimestamp('6:42')).toBe(402);
    expect(parseTimestamp('1:02:03')).toBe(3723);
    expect(parseTimestamp('6:4')).toBeNull();
    expect(parseTimestamp('6:60')).toBeNull();
  });

  it('links the note’s own track briefly and others by entry', () => {
    const a = at('the [peak] lands');
    expect(
      apply(
        a.value,
        insertTimestamp(a.value, a.sel, {
          entryId: 'e1',
          seconds: 402,
          own: true,
          fallbackLabel: 'x',
        })
      )
    ).toBe('the [peak](#t=6:42)| lands');
    const c = at('hear | here');
    expect(
      apply(
        c.value,
        insertTimestamp(c.value, c.sel, {
          entryId: 'playlist_entry_1',
          seconds: 600,
          own: false,
          fallbackLabel: 'Twist at 10:00',
        })
      )
    ).toBe('hear [Twist at 10:00](#entry=playlist_entry_1&t=10:00)| here');
  });
});

it('counts characters as the server does', () => {
  expect(characterCount('  café 🎸 ')).toBe(6);
});
