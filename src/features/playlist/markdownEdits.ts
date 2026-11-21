// The editor's Markdown shortcuts as text transforms (MarkdownField applies them).
// Each takes the text and the selection and returns what replaces which range,
// and where the selection goes after: the field applies it as one undoable edit.
// Pure, so tested (markdownEdits.test.ts). The stored text is always exactly what
// these produce: nothing reformats it later.

export type Selection = { start: number; end: number };

/** Replace `range` with `text`, then select `select` (absolute, in the new text). */
export type TextEdit = { range: Selection; text: string; select: Selection };

/**
 * Bold (`**`) or italic (`*`) around the selection, or off again when it's
 * already wrapped (inside or just outside the markers). With nothing selected it
 * inserts the pair and puts the cursor between.
 */
export function toggleWrap(value: string, sel: Selection, marker: '**' | '*'): TextEdit {
  const { start, end } = sel;
  const inner = value.slice(start, end);
  const n = marker.length;
  // `**bold**` selected whole: unwrap it.
  if (
    inner.length >= 2 * n &&
    inner.startsWith(marker) &&
    inner.endsWith(marker) &&
    isMarker(inner, n, marker)
  ) {
    const text = inner.slice(n, -n);
    return { range: sel, text, select: { start, end: start + text.length } };
  }
  // `bold` selected inside `**…**`: take the markers away.
  const before = value.slice(start - n, start);
  const after = value.slice(end, end + n);
  // For italic, the asterisk must stand alone: `**x**` around a selection is bold's.
  const alone = marker === '**' || (value[start - n - 1] !== '*' && value[end + n] !== '*');
  if (before === marker && after === marker && alone) {
    return {
      range: { start: start - n, end: end + n },
      text: inner,
      select: { start: start - n, end: end - n },
    };
  }
  return {
    range: sel,
    text: `${marker}${inner}${marker}`,
    select: { start: start + n, end: end + n },
  };
}

/** `*` and `**` overlap: `**x**` isn't italic `*` around `*x*`. */
function isMarker(wrapped: string, n: number, marker: string) {
  if (marker === '**') return true;
  // Italic: the run of asterisks on each side is exactly one.
  return wrapped[n] !== '*' && wrapped[wrapped.length - n - 1] !== '*';
}

/**
 * A link around the selection: `[selection](url)`. Without a URL the cursor
 * lands where it goes; without a selection the label is the URL's own place.
 */
export function insertLink(value: string, sel: Selection, url = ''): TextEdit {
  const label = value.slice(sel.start, sel.end);
  const text = `[${label}](${url})`;
  const urlStart = sel.start + label.length + 3;
  return {
    range: sel,
    text,
    select: label
      ? url
        ? { start: sel.start + text.length, end: sel.start + text.length }
        : { start: urlStart, end: urlStart }
      : // No label yet: select its place, so typing fills it.
        { start: sel.start + 1, end: sel.start + 1 },
  };
}

/** A pasted `https:` URL over a selection becomes a link to it; anything else pastes as is. */
export function pasteAsLink(value: string, sel: Selection, pasted: string): TextEdit | null {
  const url = pasted.trim();
  if (sel.start === sel.end || !/^https:\/\/\S+$/i.test(url)) return null;
  const label = value.slice(sel.start, sel.end);
  // Don't nest: a selection that already holds link syntax pastes as text.
  if (/[[\]]/.test(label)) return null;
  return insertLink(value, sel, url);
}

/** `m:ss`, or `h:mm:ss` from an hour, the grammar links use. */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/**
 * A timestamp link: `#t=` for the note's own track, `#entry=…&t=` for any
 * other. The selection is the label; with none, `fallbackLabel`.
 */
export function insertTimestamp(
  value: string,
  sel: Selection,
  target: { entryId: string; seconds: number; own: boolean; fallbackLabel: string }
): TextEdit {
  const t = formatTimestamp(target.seconds);
  const href = target.own ? `#t=${t}` : `#entry=${target.entryId}&t=${t}`;
  const label = value.slice(sel.start, sel.end) || target.fallbackLabel;
  const text = `[${label.replace(/[[\]]/g, '')}](${href})`;
  const after = sel.start + text.length;
  return { range: sel, text, select: { start: after, end: after } };
}

/** Seconds for `m:ss` or `h:mm:ss`, or null if it isn't one. */
export function parseTimestamp(text: string): number | null {
  const m = /^(?:(\d+):([0-5]\d):([0-5]\d)|(\d+):([0-5]\d))$/.exec(text.trim());
  if (!m) return null;
  return m[1] !== undefined
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    : Number(m[4]) * 60 + Number(m[5]);
}

/** Characters as the server counts them (code points). */
export const characterCount = (text: string) => [...text.trim().normalize('NFC')].length;
