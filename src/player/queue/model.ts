// ---------------------------------------------------------------------------
// The play queue's model: plain data and pure functions.
//
// The queue is the current entry, then "Next up" (added by the user, played
// first, in the order added, each dropped once playback moves past it), then
// the context (the show or song list playback came from).
//
// compose() flattens that into the one list gapless plays. Nothing here knows
// about gapless, React, storage or the network; see docs/play-queue.md.
// ---------------------------------------------------------------------------

/** One entry in the queue: enough to render and play it after a reload, with no request. */
export type QueueItem = {
  /**
   * Unique in the queue. A context entry's key is its trackId, so the same
   * track keeps its key (and gapless its loaded audio) when a page plays its
   * context again.
   */
  key: string;
  trackId: string;
  sourceId: string;
  showId: string;
  artistSlug: string;
  artistName: string;
  /** YYYY-MM-DD */
  date: string;
  trackSlug: string;
  title: string;
  /** Seconds. */
  duration?: number;
  venue?: string;
  /** The file, as the API gives it (proxied when played; see proxyStreamUrl). */
  mp3Url: string;
};

export type QueueContext = {
  /** e.g. "Grateful Dead · 1977-05-08" */
  label: string;
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
};

export const emptyQueue: QueueState = {
  context: null,
  upNext: [],
  current: null,
  cursor: null,
};

/**
 * The full list for gapless: context history, the current entry, Next up,
 * then the rest of the context. History stays so previous() works.
 */
export function compose(state: QueueState): QueueItem[] {
  const order = state.context?.items ?? [];
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

/**
 * Play a context from `startKey` (a key of one of `ctx.items`, else the
 * first). Next up is kept, except the start entry (moved there from a
 * context). Other items with a key already in the context, or in Next up,
 * are dropped: gapless needs unique keys.
 */
export function playContext(state: QueueState, ctx: QueueContext, startKey: string): QueueState {
  // The requested entry plays from the context even if it was moved into Next up.
  const upNext = ctx.items.some((i) => i.key === startKey)
    ? state.upNext.filter((i) => i.key !== startKey)
    : state.upNext;
  const seen = new Set(upNext.map((i) => i.key));
  const items: QueueItem[] = [];
  for (const item of ctx.items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    items.push(item);
  }
  const start = items.find((i) => i.key === startKey) ?? items[0];
  if (!start) return { ...state, upNext, context: { ...ctx, items }, cursor: null };
  return {
    ...state,
    upNext,
    context: { ...ctx, items },
    current: { key: start.key, from: 'context', item: start },
    cursor: start.key,
  };
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

/**
 * What the queue panel shows: the context before the cursor (already played),
 * now playing, Next up, then the rest of the context.
 */
export function queueView(state: QueueState) {
  const order = state.context?.items ?? [];
  const i = contextIndex(state);
  return {
    // Playing from Next up, the cursor entry has been played too.
    played: order.slice(0, state.current?.from === 'context' ? i : i + 1),
    current: state.current?.item ?? null,
    upNext: state.upNext,
    label: state.context?.label ?? null,
    rest: order.slice(i + 1),
  };
}

// ---- Next up -----------------------------------------------------------------

/**
 * Add to the front of Next up (Play next). Items need keys of their own, not
 * a trackId (the same track can be in the context too); see nextUpKey. Keys
 * already queued are skipped. With nothing current, the first becomes current.
 */
export function playNext(state: QueueState, items: QueueItem[]): QueueState {
  const fresh = unqueued(state, items);
  if (!fresh.length) return state;
  if (!state.current) {
    const [first, ...rest] = fresh;
    return {
      ...state,
      current: { key: first.key, from: 'upNext', item: first },
      upNext: [...rest, ...state.upNext],
    };
  }
  return { ...state, upNext: [...fresh, ...state.upNext] };
}

/** Add to the end of Next up (Add to queue). With nothing current, the first becomes current. */
export function addToQueue(state: QueueState, items: QueueItem[]): QueueState {
  const fresh = unqueued(state, items);
  if (!fresh.length) return state;
  if (!state.current) return playNext(state, fresh);
  return { ...state, upNext: [...state.upNext, ...fresh] };
}

/**
 * Where the context continues from: the current entry, or (while Next up
 * plays) the cursor. -1 with neither.
 */
function contextIndex(state: QueueState): number {
  const order = state.context?.items ?? [];
  const after = state.current?.from === 'context' ? state.current.key : state.cursor;
  return after ? order.findIndex((item) => item.key === after) : -1;
}

/** The entries in the order the queue panel lists them. */
const listed = (state: QueueState): QueueItem[] => {
  const { played, current, upNext, rest } = queueView(state);
  return [...played, ...(current ? [current] : []), ...upNext, ...rest];
};

/**
 * Take a context entry out. Removing the cursor (while Next up plays) moves
 * it back to the entry before, so the context still continues from there.
 */
function withoutContextEntry(state: QueueState, key: string): QueueState {
  const ctx = state.context;
  const i = ctx ? ctx.items.findIndex((x) => x.key === key) : -1;
  if (!ctx || i === -1) return state;
  const cursor = state.cursor === key ? (ctx.items[i - 1]?.key ?? null) : state.cursor;
  return { ...state, cursor, context: { ...ctx, items: ctx.items.filter((x) => x.key !== key) } };
}

/**
 * Move an entry to just after `after` (null: the top) in the list the queue
 * panel shows: played, current, Next up, the rest. Dropped among Next up it
 * joins Next up; anywhere else it's a context entry. At the edge between the
 * two (just after the current entry, or just after the last Next up entry)
 * it stays in the list it was in. The current entry stays in the context,
 * and one playing from Next up doesn't move.
 */
export function move(state: QueueState, key: string, after: string | null): QueueState {
  if (after === key) return state;
  const { current } = state;
  const isCurrent = current?.key === key;
  if (isCurrent && current.from === 'upNext') return state;

  const inUpNext = state.upNext.some((i) => i.key === key);
  const item = inUpNext
    ? state.upNext.find((i) => i.key === key)
    : state.context?.items.find((i) => i.key === key);
  if (!item) return state;

  const rows = listed(state).filter((i) => i.key !== key);
  const a = after === null ? -1 : rows.findIndex((i) => i.key === after);
  if (after !== null && a === -1) return state;
  const above = rows[a];
  const below = rows[a + 1];
  const queued = (row?: QueueItem) => !!row && state.upNext.some((i) => i.key === row.key);
  const toUpNext =
    !isCurrent &&
    (queued(above) && queued(below)
      ? true
      : queued(above) || queued(below)
        ? inUpNext // the edge: stay put
        : false);

  if (toUpNext) {
    const upNext = state.upNext.filter((i) => i.key !== key);
    const at = queued(above) ? upNext.findIndex((i) => i.key === above.key) + 1 : 0;
    const base = inUpNext ? state : withoutContextEntry(state, key);
    return { ...base, upNext: [...upNext.slice(0, at), item, ...upNext.slice(at)] };
  }

  // Into the context, after the nearest context entry above (or the current one).
  const base = inUpNext
    ? { ...state, upNext: state.upNext.filter((i) => i.key !== key) }
    : withoutContextEntry(state, key);
  const items = base.context?.items ?? [];
  const anchor = rows
    .slice(0, a + 1)
    .reverse()
    .find((row) => items.some((i) => i.key === row.key));
  const at = anchor ? items.findIndex((i) => i.key === anchor.key) + 1 : 0;
  const ctx = base.context ?? { label: '', items: [] };
  const moved = {
    ...base,
    context: { ...ctx, items: [...items.slice(0, at), item, ...items.slice(at)] },
  };
  // The current entry is the cursor, and stays it wherever it goes. Moving the
  // cursor while Next up plays (a played entry) leaves the cursor on the entry
  // before it (withoutContextEntry), so the context continues from where it
  // was, and the moved entry plays again where it lands.
  return isCurrent ? { ...moved, cursor: key } : moved;
}

/**
 * Remove an entry. Removing the current one moves on to the entry after it
 * (or stops, with nothing after).
 */
export function remove(state: QueueState, key: string): QueueState {
  if (state.current?.key === key) {
    const list = compose(state);
    const next = list[list.findIndex((i) => i.key === key) + 1];
    const moved = next ? advanceTo(state, next.key) : { ...state, current: null };
    return withoutContextEntry(moved, key);
  }
  const upNext = state.upNext.filter((i) => i.key !== key);
  if (upNext.length !== state.upNext.length) return { ...state, upNext };
  return withoutContextEntry(state, key);
}

/** A Next up entry's key: unique, and never a context entry's (which is its trackId). */
export const nextUpKey = (trackId: string, id: string) => `next:${trackId}:${id}`;

function unqueued(state: QueueState, items: QueueItem[]): QueueItem[] {
  const taken = new Set(compose(state).map((i) => i.key));
  return items.filter((i) => {
    if (taken.has(i.key)) return false;
    taken.add(i.key);
    return true;
  });
}
