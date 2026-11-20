# Playlist editing: design

Status: agreed direction, 2026-11-20. Covers building, editing and publishing playlists on relisten-web. The API side is specified in RelistenApi: [`docs/design/2026-11-18-playlist-guide-content.md`](../../RelistenApi/docs/design/2026-11-18-playlist-guide-content.md) (descriptions, Markdown subset, timestamp links) and [`docs/design/2026-11-18-playlist-sharing.md`](../../RelistenApi/docs/design/2026-11-18-playlist-sharing.md) (publishing, following, copies). The read views (`src/features/playlist/`) already ship.

## Decisions

- **Writes go from the browser straight to the User Service**, same origin: `POST /v1/playlists`, `POST /v1/playlists/{id}/operations:batch`, `PUT /v1/playlists/{id}/publication`, with the CSRF token from `/api/user/v1/csrf` in `X-Relisten-CSRF`. The relisten.net ingress and the preview gateway already route these paths. Server actions are used only where the web server itself has work to do: publishing and unpublishing invalidate the public page's cache (`revalidateTag`).
- **Edits are an operation log.** The draft is a `PlaylistContent` in an external store (`useSyncExternalStore`). Every change is an operation with a client-generated TypeID, applied optimistically by one pure `applyOp(content, op)` and sent in batches with the base revision. Structural operations send immediately; text edits coalesce per field and send on blur or after ~800ms idle. On a revision conflict the store refetches the snapshot and replays its pending operations (they address IDs, not positions). Each operation records its inverse, which is undo.
- **Positions are anchors.** The API places entries and segments `after`/`before` an ID and computes ranks. A drop between two cells is "after A"; a drop between two groups is `move_entry` with a `new_segment_id`. A run of tracks added together (Twist → Jam) goes in as one segment, so it stays together under shuffle.
- **Markdown renders on the server only.** One sanitizer (CommonMark via `mdast-util-from-markdown`, no GFM) walks the tree into React elements over the guide subset: paragraphs, bold, italics, lists, block quotes, `##`/`###` headings, `https:` links, `#t=` / `#entry=…&t=` links, single newline as a line break. Everything else renders as text; no `dangerouslySetInnerHTML`. Bare timestamps link only in track descriptions and only within the track's duration. The shared vectors (`RelistenUserServiceTests/Fixtures/playlists/guide-markdown-vectors.json`) run in vitest.
- **The editor is the read view in edit mode.** `/account/playlists/[playlistId]/edit` renders the same blocks, sections, cells and rail as the read pages, plus edit chrome passed in as slots. A prose cell is rendered text until focused, then a `<textarea>` (`field-sizing: content`) of its source. On blur the edit is saved and `router.refresh()` brings back the server render; until then the cell shows its source in the same type. No rich-text library: our own textarea with ⌘B/⌘I/⌘K, paste-a-URL-over-a-selection, and **Insert Timestamp**. The stored text is always exactly what the author typed.
- **Drag and drop is Pragmatic drag and drop** (native HTML5 events, ~5 KB): a drop line on the rail, no reflow while dragging. Every move is also in the cell's menu (**Move Up**, **Move Down**, **Move to Section…**, **Move to New Section**), which is the keyboard and screen-reader path and the touch fallback.
- **Tracks get in from where people listen.** **Add to Playlist** in `QueueMenu` (show, song, now-playing and queue rows), **Add Show to Playlist**, and the playing track from the player. Each is one `insert_entries` (or one `POST /v1/playlists` for **New Playlist…**) with a toast offering **Open** and **Undo**. Search inside the editor (song, then a performance) comes last.
- **Preview before publishing** is the public page rendered from the owner's snapshot (a public snapshot is the playlist as written). Link previews are an OG image from the existing takumi route, keyed by public code and revision.

## Boundaries

Each part has one job and a fixed direction of imports. The lint layering in `oxlint.config.ts` enforces the existing layers; `src/playlists` gets its own rule like `src/player`'s.

| Part                     | Where                                           | Owns                                                                                                                                  | Never                                 |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Wire and operation types | `src/domain/playlists.ts`                       | Snapshot, operation and receipt shapes                                                                                                | Logic                                 |
| Operations               | `src/domain/playlistOps.ts`                     | `applyOp`, inverses, TypeID generation. Pure, no React, no fetch                                                                      | Network, UI                           |
| Guide Markdown           | `src/lib/guideMarkdown/`                        | Parse, sanitize, auto-link timestamps, to an element tree via a `renderLink` callback                                                 | The player, fetching, editing         |
| Playlist service         | `src/playlists/` (client)                       | Transport (CSRF, batches, retries with the same operation IDs, errors), the draft store, commands (`addToPlaylist`, `createPlaylist`) | Importing features or the shell       |
| Read views               | `src/features/playlist/`                        | Pages, blocks, cells, rail; slots for edit chrome                                                                                     | Importing the editor                  |
| Editor                   | `src/features/playlist/edit/`                   | The edit route, cell and gap chrome, `MarkdownField`, the drag adapter                                                                | Its own copy of a read-view component |
| Add to Playlist          | `src/player/` menu item calling `src/playlists` | The menu and its toast                                                                                                                | The draft store                       |

Server-only data (`src/data/playlists.ts`) stays the read path. The client never imports it.

## Not in scope

Each of these is its own task if it's wanted, filed with `--discovered-from`:

- Real-time collaboration, multi-tab sync, offline queues that survive a reload.
- A rich-text or WYSIWYG editor, a Markdown toolbar beyond the shortcuts above, image embeds.
- Dragging between pages or windows, a playlist tray.
- Following, copying and reporting UI (the sharing doc), and moderation tooling.
- Waveforms, timeline markers on tracks.
- Changing the read views' design while building the editor. Design changes are their own tasks.
