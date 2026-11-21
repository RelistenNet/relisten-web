// A textarea's undo history, kept by the field rather than the browser. The
// browser's own history only records typing; an edit made in script (setRangeText)
// can't join it without execCommand, which is deprecated and inconsistent. So the
// field records every state itself and answers undo and redo from here. Pure.

export type FieldState = { value: string; start: number; end: number };

/** Typing within this long of the last keystroke joins the same undo step. */
export const TYPING_GROUP_MS = 600;

export type FieldHistory = {
  past: FieldState[];
  present: FieldState;
  future: FieldState[];
  /** When the present step was last typed into (null: closed to typing). */
  typedAt: number | null;
};

export const startHistory = (present: FieldState): FieldHistory => ({
  past: [],
  present,
  future: [],
  typedAt: null,
});

const same = (a: FieldState, b: FieldState) => a.value === b.value;

/**
 * Records a new state. Typing (`typed`) soon after more typing amends the current
 * step; anything else starts a new one. Either way, redo is gone.
 */
export function record(
  h: FieldHistory,
  next: FieldState,
  { typed, now }: { typed: boolean; now: number }
): FieldHistory {
  if (same(h.present, next)) return { ...h, present: next };
  const joins = typed && h.typedAt !== null && now - h.typedAt < TYPING_GROUP_MS;
  return {
    past: joins ? h.past : [...h.past, h.present],
    present: next,
    future: [],
    typedAt: typed ? now : null,
  };
}

export function undo(h: FieldHistory): FieldHistory {
  const previous = h.past.at(-1);
  if (!previous) return h;
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future],
    typedAt: null,
  };
}

export function redo(h: FieldHistory): FieldHistory {
  const [next, ...rest] = h.future;
  if (!next) return h;
  return { past: [...h.past, h.present], present: next, future: rest, typedAt: null };
}
