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
 * first). Next up is kept. Items with a key already in the context, or in
 * Next up, are dropped: gapless needs unique keys.
 */
export function playContext(state: QueueState, ctx: QueueContext, startKey: string): QueueState {
  const seen = new Set(state.upNext.map((i) => i.key));
  const items: QueueItem[] = [];
  for (const item of ctx.items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    items.push(item);
  }
  const start = items.find((i) => i.key === startKey) ?? items[0];
  if (!start) return { ...state, context: { ...ctx, items }, cursor: null };
  return {
    ...state,
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

/** What the queue panel shows: now playing, Next up, then the rest of the context. */
export function upcoming(state: QueueState) {
  const order = state.context?.items ?? [];
  const after = state.current?.from === 'context' ? state.current.key : state.cursor;
  const i = after ? order.findIndex((item) => item.key === after) : -1;
  return {
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

/** Move a Next up entry after another one, or to the front ('start'). */
export function move(state: QueueState, key: string, after: string): QueueState {
  const item = state.upNext.find((i) => i.key === key);
  if (!item || after === key) return state;
  const rest = state.upNext.filter((i) => i.key !== key);
  const at = after === 'start' ? 0 : rest.findIndex((i) => i.key === after) + 1;
  if (after !== 'start' && at === 0) return state;
  return { ...state, upNext: [...rest.slice(0, at), item, ...rest.slice(at)] };
}

/** Remove a Next up entry. */
export function remove(state: QueueState, key: string): QueueState {
  const upNext = state.upNext.filter((i) => i.key !== key);
  return upNext.length === state.upNext.length ? state : { ...state, upNext };
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
