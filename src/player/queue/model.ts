// ---------------------------------------------------------------------------
// The play queue's model: plain data and pure functions.
//
// The queue is the current entry, then "Next up" (added by the user, played
// first, in the order added, each dropped once playback moves past it), then
// the context (the show, song list or playlist playback came from).
//
// compose() flattens that into the one list gapless plays. Nothing here knows
// about gapless, React, storage or the network; see docs/play-queue.md.
// ---------------------------------------------------------------------------

export type RepeatMode = 'off' | 'all' | 'one';

/** One entry in the queue. Enough to render it without a request; no stream URLs. */
export type QueueItem = {
  /** Unique per entry: the same track can be queued twice. Made by the caller. */
  key: string;
  trackId: string;
  sourceId: string;
  showId: string;
  artistId: string;
  artistSlug: string;
  artistName: string;
  /** YYYY-MM-DD */
  date: string;
  trackSlug: string;
  title: string;
  /** Seconds. */
  duration?: number;
  venue?: string;
};

/** Enough to fetch a context's tracks again (for stream URLs after a reload). */
export type ContextRef =
  | { kind: 'show'; showId: string; sourceId: string }
  /** `params` are the song table's URL state (q, sort, filters), without the page. */
  | { kind: 'song'; artistId: string; songSlug: string; params: Record<string, string> }
  | { kind: 'playlist'; playlistId: string }
  | { kind: 'tour'; artistId: string; tourSlug: string }
  | { kind: 'venue'; venueSlug: string };

export type QueueContext = {
  ref: ContextRef;
  /** e.g. "Grateful Dead · 1977-05-08" */
  label: string;
  /** Natural (unshuffled) order. */
  items: QueueItem[];
};

export type QueueState = {
  context: QueueContext | null;
  /** Added by the user and not yet played, in play order. */
  upNext: QueueItem[];
  /** The entry playing (or paused on). A Next up entry lives only here once it's current. */
  current: { key: string; from: 'context' | 'upNext'; item: QueueItem } | null;
  /** The context entry playback continues after (the last context entry that was current). */
  cursor: string | null;
  /** The context in seeded order, with `anchorKey` first. Null when shuffle is off. */
  shuffle: { seed: number; anchorKey: string | null } | null;
  repeat: RepeatMode;
};

export const emptyQueue: QueueState = {
  context: null,
  upNext: [],
  current: null,
  cursor: null,
  shuffle: null,
  repeat: 'off',
};

// ---------------------------------------------------------------------------
// Composing the list gapless plays
// ---------------------------------------------------------------------------

/** The context in play order: natural, or shuffled with the anchor first. */
export function contextOrder(state: QueueState): QueueItem[] {
  const items = state.context?.items ?? [];
  if (!state.shuffle) return items;
  const { seed, anchorKey } = state.shuffle;
  const anchor = items.find((i) => i.key === anchorKey);
  const rest = items.filter((i) => i !== anchor);
  const shuffled = seededOrder(rest, seed);
  return anchor ? [anchor, ...shuffled] : shuffled;
}

/**
 * The full list for gapless: context history, the current entry, Next up,
 * then the rest of the context. History stays so previous() works, and
 * repeat 'all' wraps to the start of the context (Next up is empty by then).
 */
export function compose(state: QueueState): QueueItem[] {
  const order = contextOrder(state);
  const { current, upNext } = state;
  if (!current) return [...order, ...upNext];

  if (current.from === 'context') {
    const i = order.findIndex((item) => item.key === current.key);
    if (i !== -1) return [...order.slice(0, i + 1), ...upNext, ...order.slice(i + 1)];
  }
  // From Next up (or a context entry no longer in the context): after the cursor.
  const c = state.cursor ? order.findIndex((item) => item.key === state.cursor) : -1;
  return [...order.slice(0, c + 1), current.item, ...upNext, ...order.slice(c + 1)];
}

/** What the queue panel shows: now playing, Next up, then the rest of the context. */
export function view(state: QueueState) {
  const order = contextOrder(state);
  const after = state.current?.from === 'context' ? state.current.key : state.cursor;
  const i = after ? order.findIndex((item) => item.key === after) : -1;
  return {
    current: state.current?.item ?? null,
    upNext: state.upNext,
    label: state.context?.label ?? null,
    nextFromContext: order.slice(i + 1),
  };
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Play a context from `startKey` (a key of one of `ctx.items`). Next up is
 * kept. If `ctx.ref` is the context already playing, existing entries keep
 * their keys (matched by trackId), so gapless keeps their decoded audio and
 * just jumps. With shuffle on, the order re-anchors at the start entry.
 */
export function playContext(
  state: QueueState,
  ctx: QueueContext,
  startKey: string,
  opts: { seed?: number } = {}
): QueueState {
  const prev = state.context;
  const items = prev && sameRef(prev.ref, ctx.ref) ? reuseKeys(prev.items, ctx.items) : ctx.items;
  const startIndex = ctx.items.findIndex((i) => i.key === startKey);
  const start = items[startIndex] ?? items[0];
  assertUnique([...items, ...state.upNext]);
  if (!start) return { ...state, context: { ...ctx, items }, cursor: null };

  return {
    ...state,
    context: { ...ctx, items },
    current: { key: start.key, from: 'context', item: start },
    cursor: start.key,
    shuffle: state.shuffle ? { seed: opts.seed ?? state.shuffle.seed, anchorKey: start.key } : null,
  };
}

/** Add to the front of Next up. With nothing current, the first item becomes current. */
export function playNext(state: QueueState, items: QueueItem[]): QueueState {
  if (items.length === 0) return state;
  assertUnique([...compose(state), ...items]);
  if (!state.current) {
    const [first, ...rest] = items;
    return {
      ...state,
      current: { key: first.key, from: 'upNext', item: first },
      upNext: [...rest, ...state.upNext],
    };
  }
  return { ...state, upNext: [...items, ...state.upNext] };
}

/** Add to the end of Next up. With nothing current, the first item becomes current. */
export function addToQueue(state: QueueState, items: QueueItem[]): QueueState {
  if (items.length === 0) return state;
  assertUnique([...compose(state), ...items]);
  if (!state.current) return playNext(state, items);
  return { ...state, upNext: [...state.upNext, ...items] };
}

/**
 * Make `key` current: what happens when gapless moves on by itself, or the
 * user picks an entry. A Next up entry drops the Next up entries before it
 * (as in Spotify); a context entry moves the cursor. The entry that was
 * current, if it came from Next up, is gone: it has been played.
 */
export function advanceTo(state: QueueState, key: string): QueueState {
  if (state.current?.key === key) return state;

  const u = state.upNext.findIndex((item) => item.key === key);
  if (u !== -1) {
    const item = state.upNext[u];
    return {
      ...state,
      current: { key, from: 'upNext', item },
      upNext: state.upNext.slice(u + 1),
    };
  }

  const item = state.context?.items.find((i) => i.key === key);
  if (item) return { ...state, current: { key, from: 'context', item }, cursor: key };

  return state;
}

/** Picking an entry in the queue panel: the same move as advancing to it. */
export const jumpTo = advanceTo;

/** Move a Next up entry after another one, or to the front ('start'). */
export function move(state: QueueState, key: string, { after }: { after: string }): QueueState {
  const from = state.upNext.findIndex((item) => item.key === key);
  if (from === -1 || after === key) return state;
  const rest = state.upNext.filter((item) => item.key !== key);
  const at = after === 'start' ? 0 : rest.findIndex((item) => item.key === after) + 1;
  if (after !== 'start' && at === 0) return state;
  return { ...state, upNext: [...rest.slice(0, at), state.upNext[from], ...rest.slice(at)] };
}

/**
 * Remove an entry from Next up or the context. The current entry can't be
 * removed. Removing the cursor moves it to the entry before, so playback
 * still continues from the same place.
 */
export function remove(state: QueueState, key: string): QueueState {
  if (state.current?.key === key) return state;
  if (state.upNext.some((item) => item.key === key)) {
    return { ...state, upNext: state.upNext.filter((item) => item.key !== key) };
  }
  if (!state.context?.items.some((item) => item.key === key)) return state;

  let cursor = state.cursor;
  if (cursor === key) {
    const order = contextOrder(state);
    cursor = order[order.findIndex((item) => item.key === key) - 1]?.key ?? null;
  }
  return {
    ...state,
    context: { ...state.context, items: state.context.items.filter((item) => item.key !== key) },
    cursor,
  };
}

/**
 * Shuffle the context (`seed`), or restore its natural order (null). The
 * entry playback continues from is anchored first, so what's already been
 * heard isn't replayed. Next up is never shuffled.
 */
export function setShuffle(state: QueueState, seed: number | null): QueueState {
  if (seed === null) return state.shuffle ? { ...state, shuffle: null } : state;
  const anchorKey =
    state.current?.from === 'context'
      ? state.current.key
      : (state.cursor ?? state.context?.items[0]?.key ?? null);
  return { ...state, shuffle: { seed, anchorKey } };
}

export function setRepeat(state: QueueState, repeat: RepeatMode): QueueState {
  return state.repeat === repeat ? state : { ...state, repeat };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Two refs point at the same context (compares by value, key order ignored). */
export function sameRef(a: ContextRef | undefined, b: ContextRef | undefined): boolean {
  if (!a || !b) return false;
  return stableStringify(a) === stableStringify(b);
}

/**
 * The context in seeded order, stable under edits: each entry's place comes
 * from a hash of its own key, so removing or re-adding one entry doesn't move
 * the others (a seeded Fisher–Yates would reshuffle everything).
 */
export function seededOrder(items: QueueItem[], seed: number): QueueItem[] {
  return items
    .map((item) => ({ item, rank: hash(seed, item.key) }))
    .sort((a, b) => a.rank - b.rank || (a.item.key < b.item.key ? -1 : 1))
    .map(({ item }) => item);
}

/** Give new items the keys of matching existing entries (same trackId, in order). */
function reuseKeys(existing: QueueItem[], incoming: QueueItem[]): QueueItem[] {
  const pool = new Map<string, QueueItem[]>();
  for (const item of existing) {
    const list = pool.get(item.trackId);
    if (list) list.push(item);
    else pool.set(item.trackId, [item]);
  }
  return incoming.map((item) => {
    const match = pool.get(item.trackId)?.shift();
    return match ? { ...item, key: match.key } : item;
  });
}

function assertUnique(items: QueueItem[]): void {
  const seen = new Set<string>();
  for (const { key } of items) {
    if (seen.has(key)) throw new Error(`queue: duplicate key "${key}"`);
    seen.add(key);
  }
}

/** 32-bit FNV-1a over the key, mixed with the seed. */
function hash(seed: number, key: string): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Final avalanche so similar keys spread out.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}
