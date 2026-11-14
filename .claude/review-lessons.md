# Relisten Review Principles

These are the principles to check every Relisten web change against. Use them whenever you review your own diff.

**Read the whole file every time.** It's short on purpose. For each principle that applies to your diff, answer it with evidence (a grep, a test, a request against the dev server), not from memory of how the code probably works.

**This file is curated by hand. Don't edit it unless you're asked to.** It stays short so it gets read. But you can ask if it should be updated when something is wrong or additive.

- A new principle has to name a class of mistake that has happened here more than once and isn't already covered.
- Prefer sharpening an existing principle's _Check_ over adding a new principle.
- If you think something belongs here, propose it in your summary.

The house rules in `AGENTS.md` apply too. They aren't repeated here.

timber.js is not Next.js. When a principle mentions a timber API, the docs are in `node_modules/@timber-js/app/docs/`.

## Product and UX

### 1. Calm and fast: the server renders the page with its data

Relisten should feel calm: no layout shift, and no spinners in place of primary content the server could have fetched. Pages and layouts are server components that fetch their own data. timber has no `loading.tsx`. A `<Suspense>` fallback is only for secondary content, and it must reserve the final layout. Pending UI comes from the router (`usePendingNavigation` with a selector, `useLinkStatus`), not from click handlers (`src/ui/table/TablePending.tsx`).

When streamed content arrives, the tree that's already on screen keeps its identity. Tabs, columns and scroll position don't remount.

- _Check:_ does the diff add a `useEffect` that fetches, or a fallback that's a different size from what replaces it? Does anything already mounted change its element type or `key` when data streams in?
- _Seen:_
  - c19f9a9: pagination shifted the layout.
  - faa8d8b, a29ed5d: tables dimmed for every navigation, not only their own.
  - 093e6cf, abb2417: the artists column remounted when the archive arrived.

### 2. The UI tells the truth about what the player will do

What the player shows (why a track can't play, each row's gapless/load status, whether it will autoplay) comes from the same function that makes the decision: `src/player/failure.ts` (`diagnose`) and `src/player/autoplay.ts` (`canAutoplay`, `browserRefusesAutoplay`). Don't re-derive a rule inside a component.

- _Check:_ for each message, badge or disabled control you added, find the code path that makes it true. Work through a case where the two could disagree.
- _Seen:_ 6ca4e9e, f2ea8dc.

### 3. Side effects report only what actually happened

Scrobbles, listen counts and autoplay are visible to other people (the live page, artists' stats), so they fire on real listening, not on loading or seeking. Embeds never autoplay on load.

- _Check:_ for each scrobble, listen or play the diff can trigger, what has the user actually heard at that point? Can a crawler, an embed, or a restored-but-paused session trigger it?
- _Seen:_ 8277042 (scrobbled unheard tracks), a16896d (listen counted per entry), 0a5c8ec (embeds autoplayed).

### 4. Mobile and cross-browser are part of done

Check every UI change at phone width, in Safari, and in Firefox:

- hit targets and padding work for a thumb;
- scroll containers behave in iOS Safari;
- CSS-anchored overlays don't sit under a transformed ancestor, because Firefox mispositions them. Fix the ancestor; don't add a polyfill or JS positioning.

Overlays like the tooltip and popover share one element across the app, mount on first hover or focus, and dismiss when their trigger unmounts.

- _Check:_ what does the change look like at 400px wide and in Firefox? If it adds an overlay, does it use the shared element?
- _Seen:_ a3ba6d2, 6caeeb2, 50d318d, 7962c37, 96b7472, 9a85758, bc56ed9.

## Web

### 5. Server components by default; `'use client'` only at the leaf

Start every component as a server component. Add `'use client'` only to the smallest piece that needs interactivity or browser APIs, and pass it server-fetched data as props. Pages, layouts and anything that fetches stay server components.

- _Check:_ for each new `'use client'`, what in that file actually needs the client? Could that part be split into its own component? (`npx timber graph <file> --json` shows which environment a file runs in.)

### 6. Use the platform: widely supported browser APIs, and CSS before JavaScript

Before writing our own utility or adding a dependency, look for a browser API that does the job and is supported by every major browser, including iOS Safari and Android Chrome (check Baseline / caniuse). When CSS and JavaScript can do the same thing about as well and are about as easy to maintain, use CSS: layout, positioning (anchor positioning), scroll snapping, transitions and animations, `:has()`, container queries, `<details>` / `popover` / `<dialog>`.

- _Check:_ does the diff add a dependency, a hand-rolled helper, or a JS listener (resize, scroll, hover, measuring) for something the platform or CSS already does? Is every new API or CSS feature supported on current mobile Safari and Firefox?

### 7. State a user navigates through lives in the URL

Filters, tabs, pagination, sort, the selected source, `?t=`: anything a user expects to survive a reload, back/forward or a shared link is a search param. Define it once with `defineSearchParams` (examples in `src/lib/searchParams/`). Then:

- server components read it with `searchParams.get()`;
- client components use `searchParams.useQueryStates()`;
- links follow the URL rule in `AGENTS.md`.

Navigating keeps the user's context: going from a show to a track, switching source, or following a subnav link carries over `?source=`, the sort and the quick-hit context.

- _Check:_ does any new `useState`, localStorage value or store field hold something the user navigates through? Does any link the diff adds drop a param the current page has?
- _Seen:_ 7fb792c, da6b71f (hand-built URLs), 1a5dc7d, 17841d1 (search box state out of sync with the URL), 87b07df (`?source=` blanked), ebb8bc8, e00d476 (subnav context lost).

### 8. Avoid `useState`: find out who really owns the value

Before adding `useState` (or a `useEffect` that syncs state), rule these out in order:

1. **Derived:** compute it from props or data during render.
2. **URL:** a search param (principle 7).
3. **Server:** it comes from the Relisten API. Render it.
4. **A form's pending or result state:** use `useActionState` / `useFormStatus` / `useOptimistic`.
5. **Player state:** it's in the player actors (`playerActor`, `playbackActor` in `src/player/runtime.ts`). Read it with a selector, and change it through `src/player/commands.ts`.

Only truly ephemeral UI (open/closed, hover) stays in `useState`. If several booleans describe one thing, derive mutually exclusive states (`@switz/driver`) instead.

- _Check:_ list every new `useState` / `useEffect` and say which of the cases above it is.
- _Seen:_ 746b2f3 (the volume had two owners), 17841d1.

### 9. SSR doesn't know about the browser: wait for hydration

The server render never sees localStorage, autoplay permission or the audio engine. Anything that depends on them (restoring the last-played track, the saved queue and position, `?t=`, autoplay) runs after hydration, and the server and first client render must match. Nothing autoplays on page load unless `canAutoplay()` says so.

Every localStorage access can throw or return garbage (private mode, blocked storage, an old version), so wrap it and fall back to the empty state. The saved queue is versioned (`STORAGE_VERSION` in `src/player/queue/storage.ts`); old versions are ignored, not migrated.

Take advantange of `use(browser())` from `react-dom` to suspend if we can. Otherwise, `uSES` is a strong pattern as well.

- _Check:_ does the diff read localStorage, `window` or the engine during render? If the stored value is missing, corrupt or from an old version, what happens? If the user presses play before hydration finishes, what happens?
- _Seen:_ 9b31221, a3781be, 6343372, 0a5c8ec, 41ad73a (`?t=` dropped before hydration), 3eed7be, 3f7464d.

## Player state and concurrency

### 10. No implicit state machines

The queue, the cursor, the current track and the playback state each have a lifecycle. Each one has a single owner: `src/player/queueLogic.ts` (`playerTransition`) for the queue and `src/player/playback.ts` for playback. Every write goes through `src/player/commands.ts`. Don't add a flag next to the machine, or a map whose emptiness means something.

- **Every state has a way out.** When you add a state or a path into one, check that removing the entry, an error, and the end of the queue can all leave it. A transition function that doesn't handle an event silently ignores it.
- **Page syncs don't fight the user.** Loading or syncing a show page leaves the current track and Next up alone unless the user asked to play something.
- **One source of truth for types.** Derive unions from the model (`src/player/queue/model.ts`, `src/domain/types.ts`); don't hand-write a second list.
- _Check:_ grep every writer of the field you touch (`playerActor.send`, `playbackActor.send`, the engine callbacks in `runtime.ts`). Is any write outside the commands module? Can any state be entered and never left? What happens when the last entry is removed, or the current one is moved?
- _Seen:_ 59c0f57, 3960718 (page syncs replaced the queue), a16896d (didn't stop when the last entry was removed), 41ad73a (cursor lost on move), 6ca4e9e.

### 11. Decide before the first `await`, re-check after every one

Player, engine, restore and storage code interleave with the user: they press play during a restore, skip during a load, or open a second tab. So:

- read the state you need and decide synchronously, before the first `await`;
- after each `await`, check that the entry or track you looked up is still the current one before you write state, start audio or save;
- a superseded load is aborted, not left to finish and overwrite the newer one.

_Check:_ for each `await` in the code you touched, write down what happens if the user acts at that point. What does this code do when it resumes?

_Seen:_ a3781be, 1f7adcd, e9aae61, 4da35b7 (restore and save raced explicit plays), 6486977, c193bb1 (restore placeholder left behind).

## Data and routes

### 12. Every external call has a timeout and a planned failure

That means the Relisten API, audio loading and anything else over the network. timber holds the response until the shell resolves, so one stalled API call outside `<Suspense>` hangs the whole page. Put a time limit on each call, and decide what happens when it fails: a 404, an error boundary, a retry, or an empty state. `src/lib/poller.ts` gets this right (an `AbortSignal` with `timeoutMs`).

- _Check:_ for each new network call, what's its timeout, and what does the user see when it fails or hangs?
- _Seen:_ 19c2495 (`relistenFetch` and the card font fetch had no timeout; the font promise is shared, so one hung request stalled every image).

### 13. A missing thing is a real 404, not a 500

Unknown artists, years, shows, songs and sources return a 404 before the shell flushes. In pages, use `resource.orDeny()` (`src/data/resource.ts`) or `deny(404)`; `isMissingStatus` decides which API statuses count as missing. Route handlers return `new Response(…, { status: 404 })`, because `deny()` in a route handler surfaces as a 500.

- _Check:_ for each new route or lookup, request it with a bad slug, a bad id and a bad date. Do you get a 404?
- _Seen:_ f7fd3d5 (song not in the show), c2107ec, 348e11c, 65a1317 (album art did its font work before 404ing).

### 14. Cached reads go through resources: deduped, bounded, slimmed

Server reads of the Relisten API go through `defineResource` (`src/data/`), which sets the cache key and TTL and requires a `slim`, so nothing big reaches the cache or the RSC payload. Don't add a one-off server fetch for a filter or sort that a cached resource already covers; it breaks deduping. Sort before caching, not per request.

- _Check:_ does the diff fetch from the API anywhere outside `src/data/`? Does anything pass a whole API response to a client component?
- _Seen:_ c2771cf (filter fetches broke RSC deduping), 02f9c2f (unbounded cache), 2998add (show data payload too big), 03ae24d.

### 15. Public routes treat URL input as hostile

Slugs, query params and sizes reach the API, the OG and album-art image routes, and the cache keys. Encode params into API URLs, validate them through the route schema and the search-param codecs, bound sizes and expensive work, and never build a fetch URL from the `Host` header.

- _Check:_ for each new input, where does it end up (an API path, a cache key, an image size, a header)? What does an oversized, malformed or encoded value do there?
- _Seen:_ c822989 (unencoded API params), 65a1317 (unbounded album-art size), 04411d0 (Host-derived self-fetch).
