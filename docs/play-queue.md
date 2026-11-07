# Play queue: design

Status: draft for review, 2026-11-06. Covers gapless (`~/y/gapless.js`, v4.4.3) and relisten-web.

## Behaviour (agreed)

- The queue is the **current** track, then **Next up** (added by the user; plays first, in the order added, and each item is removed once playback moves past it), then the **context** (a show, a song's performances, a playlist, a tour or a venue).
- Playing a different show **replaces the context and keeps Next up**.
- Repeat `all` loops **only the context**. It works without special-casing: Next up items have already been removed by the time playback wraps.
- Repeat `one` loops the current track.
- Shuffle reorders **only the context**. The current track stays put, and Next up is never shuffled. Turning shuffle off restores the natural order.
- The song page's **Play all** creates a `song` context of the performances that match the current filters. Changing the filters later doesn't affect a queue that's already playing.

## gapless: key-based play order

### Identity: tracks by reference, indices only as positions

The public API identifies entries by key. Internally, tracks are identified by reference; an index only ever means a position. (The spike first kept the machine index-based, renumbering `Track.index` on every edit. That mixed two identity models, so it was replaced before publishing.)

- The queue machine is generic over its entries. Its context is `{ current, list }`, where `list` is a `PlayList` the queue implements: `next`, `previous`, `first`, `size`, `repeatsCurrent`. Repeat lives only in the queue.
- Events carry entries: `GOTO { track }`, `REMOVE_TRACK { track, successor }`, `TRACK_LOADED { track }`. After an edit, `LIST_CHANGED { current }` tells the machine which entry is current.
- `Queue._nextOf(track)` is the one answer to "what plays next" (it wraps under repeat `all`), for the machine, preloading, gapless scheduling and the preload window.
- Positions are derived at the edge: `currentTrackIndex`, `TrackInfo.index`, `gotoTrack(i)`, `removeTrack(i)`.

Every edit that keeps the current track goes through `_applyOrder`, which:

1. reuses Track instances by key, so decoded buffers and preloads survive, and destroys the dropped ones;
2. sends `LIST_CHANGED`;
3. if the track after the current one changed, cancels its scheduled gapless start, then preloads and schedules the new one;
4. aborts downloads for tracks that left the preload window (see below).

The playing track is never deactivated by an edit, unless the edit removes it.

### Public API (additive; shipped in 5.0.0-alpha.0)

```ts
type Entry = { key: string; url: string; metadata?: TrackMetadata; skipHEAD?: boolean };

queue.setEntries(entries, { startKey?, startTime?, play? })
  // Replaces the list, reconciling by key, without destroying the audio graph.
  // If the playing key is still present, it keeps playing and startKey is ignored.
queue.insert(entries, { after: key | 'current' | 'start' | 'end' })
queue.move(key, { after: key | 'start' })
queue.remove(key)             // Removing the playing entry advances (the existing REMOVE_TRACK path).
queue.goto(key, { play?, startTime? })
queue.setRepeat('off' | 'all' | 'one')
queue.snapshot(): { entries: Entry[]; currentKey: string | null; currentTime: number; repeat }
queue.restore(snapshot, { play? })  // = setEntries + seek
queue.onChange(cb: (s: { keys: string[]; currentKey: string | null; repeat }) => void): () => void
TrackInfo.key                 // new field
```

- `addTrack`, `removeTrack` and `gotoTrack` stay as index-based wrappers. `addTrack` generates its own key. relisten-web keeps working unchanged until it moves over.
- **Repeat `all`:** `_nextOf(last)` returns the first track. The machine's guards, preloading and gapless scheduling all ask that one helper, so the wrap is gapless too.
- **Repeat `one`:** on TRACK_ENDED, seek to 0 and play. This is not sample-gapless in v1: it would need a second source node on the same buffer. That's noted as a follow-up.
- **`next()` and `previous()` under repeat `all`:** `next()` at the end goes to the first entry. `previous()` at the start stays put, as it does now.
- **Shuffling mid-track works,** like any reorder: the current track keeps playing, the old next track's scheduled start is cancelled, and the new next track is preloaded and scheduled.
- **gapless doesn't decide the shuffled order; the app does,** because Next up has to stay out of the shuffle. The app passes the shuffled order to `setEntries`.
- **Displaced downloads are aborted.** If the old next track is still downloading when it moves out of the preload window (the current track plus the next `preloadNumTracks`), its fetch is aborted so it doesn't compete with the new next track. Decoded buffers are kept. A decode in progress is allowed to finish, since the bytes have already arrived.

### Tests (vitest, the existing mocks in `tests/setup.ts`)

- An edit while playing never calls `deactivate` or `play` on the current track.
- A scheduled gapless start is kept when an edit doesn't change "next", and is cancelled and rescheduled when it does.
- Inserting after the current entry while the next one is already scheduled.
- Removing the current entry, removing the last entry, and `setEntries` without the current key.
- Repeat `all` wraps gaplessly, and repeat `one` restarts the track.
- Reconciling reuses buffers: a kept key is never fetched twice.
- `snapshot()` → `restore()` round-trips.
- Extend `fuzz.test.ts` with random edits during playback, with slow downloads. Its invariants read the machine's real current entry and check against an independent spec of play order: a scheduled track is the one that plays next, and nothing outside the preload window is still downloading.

## relisten-web: architecture

```
 UI (client components)        commands.ts                player machine (xstate)
 ┌──────────────────────┐   ┌───────────────┐   ┌────────────────────────────────────┐
 │ track rows, song rows│──▶│ playContext   │──▶│ context: QueueState                │
 │ PlayerManager (URL)  │   │ playNext, add │   │ lifecycle: booting → restored →    │
 │ PlayerBar, QueuePanel│   │ move, remove  │   │   resolving → ready (+ ephemeral)  │
 │ keyboard, media keys │   │ shuffle,repeat│   │ queue edits: root-level assigns    │
 └─────────▲────────────┘   │ play/pause/   │   │   calling the pure model.ts ops    │
           │ useSelector    │ seek          │   │ invokes: engine (fromCallback),    │
           │ (@xstate/react)└───────┬───────┘   │   resolve (fromPromise)            │
           │                        │           └─────────┬──────────────────▲───────┘
           │                        │ transport           │ order + current  │ ADVANCED
           │                        ▼                     ▼                  │
           │                ┌───────────────────────────────────────────────┴───┐
           │                │ engine: owns the one gapless Queue                │
           │                │ setEntries(compose(state)); goto if current       │
           │                │ differs; onChange → ADVANCED; side effects:       │
           │                │ scrobble, listen tracking, URL/title sync         │
           │                └──────────────────────┬────────────────────────────┘
           │   position actor (fromTransition) ◀───┤ onProgress, ~60 fps
           └────────────── scrubber, time ─────────┘
                                                   ▼
                                           gapless@5 Queue
```

### Principles

- **Order and the current entry are declarative.** The machine holds `QueueState`. The engine reconciles gapless to it: `setEntries(compose(state))`, which is safe to repeat since unchanged keys cost nothing, then `goto(state.current)` if gapless is elsewhere. When gapless moves on by itself (a track ends, media keys), the engine sends `ADVANCED { key }`, the machine records it, and the next reconcile is a no-op. This is all synchronous, so a click and a track ending can't race.
- **Transport is imperative.** Play, pause, seek and volume go straight to the engine. They aren't queue state.
- **Pure model, thin machine.** `model.ts` holds plain functions: `compose`, the operations and the seeded shuffle, all unit-tested. The machine's queue edits are `assign`s that call them.
- **The UI never touches gapless.** It reads with `useSelector(playerActor, selector)` and writes through `commands.ts`.
- **Position is separate.** Time and duration change about 60 times a second, so they live in a small `fromTransition` actor. Only the scrubber and the time display subscribe to it. The main machine, and every selector on it, change only on edits and track changes. Today every progress frame dispatches to Redux with a new `gaplessTracksMetadata` array, so `TrackList` re-renders on every frame.
- **No Redux.** The `playback` slice, the Redux `Provider` and `@reduxjs/toolkit`/`react-redux`/`redux` are removed. xstate already ships with gapless, and the app declares `xstate@^5.33.3` so pnpm keeps one copy. The only new dependency is `@xstate/react`.

### The player machine (`src/player/player.machine.ts`)

The lifecycle states are the parts the queue would otherwise track with flags:

- `booting`: before hydration. On the server, and on the first client render, selectors see this empty snapshot, so the HTML matches.
- `restored`: `HYDRATED { saved }` loaded the saved queue after hydration. The player bar renders from the items, with no request.
- `resolving`: a `fromPromise` fetches stream URLs for what's about to play. A `PLAY` here is remembered and runs on `RESOLVED`.
- `ready`: the engine is reconciling gapless.
- `error`: `RESOLVE_FAILED`; retry on the next `PLAY`.
- `ephemeral`: embeds. There's one show context and no Next up, and nothing is saved or restored.

Queue edits (`PLAY_CONTEXT`, `PLAY_NEXT`, `ADD_TO_QUEUE`, `MOVE`, `REMOVE`, `JUMP_TO`, `ADVANCED`, `SET_SHUFFLE`, `SET_REPEAT`) are handled at the root, in every state. Only the lifecycle has states; "shuffle on" or "has Next up" are context, not states.

### Types (`src/player/queue/model.ts`)

```ts
type QueueItem = {
  key: string; // unique per entry. The same track can be queued twice.
  trackId: string;
  sourceId: string;
  showId: string;
  artistId: string;
  artistSlug: string;
  artistName: string;
  date: string; // YYYY-MM-DD
  trackSlug: string;
  title: string;
  duration?: number;
  venue?: string;
}; // No URLs.

type ContextRef =
  | { kind: 'show'; showId: string; sourceId: string }
  | { kind: 'song'; artistId: string; songSlug: string; filters: SongFilters }
  | { kind: 'playlist'; playlistId: string }
  | { kind: 'tour'; artistId: string; tourSlug: string }
  | { kind: 'venue'; venueSlug: string };

type QueueState = {
  context: { ref: ContextRef; label: string; items: QueueItem[] } | null; // natural order
  upNext: QueueItem[]; // not yet played
  current: { key: string; from: 'context' | 'upNext'; item: QueueItem } | null;
  cursor: string | null; // the context entry playback continues after
  shuffle: { seed: number; anchorKey: string } | null;
  repeat: 'off' | 'all' | 'one';
};
```

- **Keys are made by the caller,** when building items from page data. The model never creates keys: it's pure, and the shuffle seed is an argument.
- **`version` and `updatedAt` belong to the saved format** (`storage.ts`), not the model.
- **The handoff's `QueueItem` gains `artistSlug`, `artistName` and `trackSlug`.** The player bar, the URL sync and `document.title` need them. Today they come from the single-show fields in `PlaybackState`, which stop making sense once the queue mixes shows.

### Composing the gapless list

`compose(state) → QueueItem[]`:

    order = shuffle ? [anchor, ...seededShuffle(rest, seed)] : context.items
    if current is from the context:   order[..current] + upNext + order[current+1..]
    if current is from Next up:       order[..cursor] + current + upNext + order[cursor+1..]

- **History stays in the list,** so `previous()` works, and repeat `all` wraps to the start of the context. Next up is always empty by the time playback wraps, so repeat `all` loops the context only.
- **A Next up item leaves the list once playback moves past it.** `advanceTo` drops it, and `setEntries` removes it from gapless. It's behind the current entry by then, so nothing is interrupted. Going back with `previous()` from the next track lands on the context entry before it, as in Spotify.
- **The shuffled order is reproducible after a reload** from the stored seed and anchor.

### Operations (pure, unit-tested)

- `playContext(state, ctx, startKey)`: replaces the context and keeps `upNext`. If `ctx.ref` equals the current ref, it **reuses the existing entries' keys** (matched by `trackId`), so a click on another track in the playing show keeps the decoded audio and just jumps. With shuffle on, it re-anchors at the start entry, using the seed passed in.
- `playNext(state, items)` and `addToQueue(state, items)`: add to the front or the end of `upNext`. If nothing is current, the first item becomes current.
- `jumpTo(state, key)` and `advanceTo(state, key)`: the same move. Jumping to a Next up item drops the Next up items before it, as in Spotify. Jumping to a context entry moves the cursor.
- `move(state, key, { after })`: within Next up.
- `remove(state, key)`: from Next up or the context. **The current entry can't be removed;** the UI doesn't offer it.
- `setShuffle(state, seed | null)` and `setRepeat(state, mode)`.

### Callers

- `PlayerManager`: on the URL of a show track, `playContext({ kind: 'show', … }, items, keyFor(songSlug))`. The navigation-means-play behaviour stays, including back and forward.
- `PlayTrackButton`: `playContext({ kind: 'song', … }, filteredRows, keyFor(row))`.
- Keyboard and media keys: transport commands.
- **URL sync:** the URL and title follow the current entry only while the page shows that entry's show. The queue never navigates.

### Persistence (`src/player/queue/storage.ts`)

- `relisten.queue` holds `QueueState`. It's written on every structural change, debounced by 250 ms, and the reader checks `version`.
- `relisten.position` holds `{ key, time, updatedAt }`, throttled to once a second (today's throttle). It's separate, so the large blob isn't rewritten during playback.
- **Migration:** if `relisten.queue` is missing and `lastPlayedUrl` is present, call `/api/restore` once to build the items, write `relisten.queue`, and delete the old keys. After that `/api/restore` exists only for this migration, and it can be deleted later.

### Multiple tabs

- **The tab that last started playback owns the queue.** It writes `relisten.owner = { tabId, at }` when playback starts.
- **Only the owner writes** `relisten.queue` and `relisten.position`.
- **Other tabs listen for the `storage` event.** They re-read the queue so the panel stays current, but they don't write.
- **Pressing play in another tab makes it the owner.** It picks up the stored queue and position.
- The same rule carries over to account sync: the device that last played wins.

### Resolving URLs at play time

- **The rendered queue needs no request:** it comes straight from stored items.
- **Turning items into gapless entries needs URLs.** Resolve them **per context, not per track**: one `showById` for a show context, and one song-detail fetch (with the stored filters) for a song context. Next up items are grouped by `showId`.
- **One new route, `/api/queue/resolve`:** it takes context refs and show ids and returns `trackId → { mp3Url, flacUrl }`. Its query string is built with `defineSearchParams`.
- **After a reload,** it runs right after hydration, where `restoreLastPlayback()` runs today, and calls `setEntries` paused at the saved position.
- **In the same session,** items created from a page already hold their `PlayableTrack`s, so there's no request.
- `proxyStreamUrl` and the FLAC preference are applied when the entries are built.
- **If a track no longer resolves,** it is dropped from gapless and shown greyed out in the panel.

## gapless status (2026-11-07: #31 merged; published as `gapless@5.0.0-alpha.0` on the `alpha` tag)

- **On the branch:** the key-based API; repeat; `snapshot()`/`restore()`; `onChange`; aborting displaced downloads; and tracks identified by reference.
  - `onChange` is batched into a microtask and fires once per edit, so a listener can call `remove()` on the queue. The app relies on this to drop a played Next up item.
- **Review:** Codex found four real bugs, all fixed and answered on the PR:
  - the `addTrack` wrap schedule;
  - the `restore()` position;
  - key collisions after a reload;
  - `GOTO` without play stuck in `playing`. That one also happened on master, through `gotoTrack(i, false)`.
- **Verified:**
  - 422 tests pass, and a 60-seed fuzz sweep passes all 1037 cases.
  - In Chromium with real audio: the insert handoff, the repeat wrap and the shuffle abort (`ERR_ABORTED`) all behave correctly.
- **Published:** `5.0.0-alpha.0` on the `alpha` dist-tag. `latest` is still 4.4.3. It's a major version because `gotoTrack(i, false)` while playing now pauses, and duplicate keys throw.

## Spike results (2026-11-06)

**Built:**

- `Track.key`, and `Track.index` made mutable.
- `_scheduledNext` held as a Track reference, not an index.
- `_applyOrder` plus the machine's `SYNC` event.
- `setEntries`, `insert`, `move`, `remove(key)`, `goto(key)`, `keys` and `currentKey`.
- Callbacks from dropped tracks are ignored.

Repeat, `snapshot`/`restore` and `onChange` came in the next commit (above).

**Results:**

- **Existing suite:** all 350 tests still pass.
- **New tests:**
  - 17 targeted tests: no interruption on edits, schedule kept or redone, buffers reused, stale callbacks ignored.
  - Mutation checks show the cancel and ownership guards are tested.
- **Fuzz:** three new scenarios (insert, move, remove, reorder and replace, mixed with navigation). Scenario K runs async in HYBRID mode with real scheduling. It enforces a new invariant: a scheduled track is always at current + 1.
  - It found 2 bugs, both fixed:
    - SYNC while `ended` didn't leave `ended`.
    - `setEntries([])` while playing stayed `playing`.
  - 1037 cases pass across 60 seeds.
- **Chromium, real audio:** after an insert ahead of a scheduled next track, both handoffs (a → n1 → b) were gapless.
- **Chromium, 400 tracks:** 43 ms to build, about 15 MB of heap, 0.1 ms to reorder, 0.1 ms per insert, and 2 audio requests (`preload='none'`). At 1000 tracks: 90 ms and about 42 MB.

**Verdict:** renumbering one array works, and the whole context fits in one gapless list. No windowing is needed.

## Out of scope for v1

- Account sync: the shape is ready for it.
- Saved playlists in the UI.
- A sample-gapless repeat `one`.
- Shuffling Next up.
- Tour and venue contexts are typed but have no entry points yet.

## Build order

1. **gapless (done: #31, `5.0.0-alpha.0`):**
   - key-based API, with tracks identified by reference;
   - repeat;
   - snapshot, restore and `onChange`;
   - aborting displaced downloads;
   - tests.
   - Published as `5.0.0-alpha.0`. The demo doesn't use the new API yet.
2. **relisten-web model:** `model.ts`: types, `compose`, the operations and the seeded shuffle, with unit tests. No UI.
3. **relisten-web plumbing (one PR):**
   - the player machine, engine, position actor, `storage.ts` (including migration) and `/api/queue/resolve`;
   - move `PlayerManager`, `PlayTrackButton`, `PlayerBar`, the embeds and restore onto it;
   - remove Redux.
   - Playwright checks: reload restores the queue paused at the saved position, and playing a show keeps Next up.
4. **UI:**
   - "Play next" and "Add to queue" on track rows and song rows;
   - a queue panel with drag to reorder, remove, shuffle and repeat.
