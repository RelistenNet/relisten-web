'use client';

import { Link, usePendingNavigation, useRouter } from '@timber-js/app/client';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  GroupIcon,
  PencilIcon,
  PlusIcon,
  TextIcon,
  Trash2Icon,
  UndoIcon,
} from 'lucide-react';
import {
  type ReactNode,
  type RefObject,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { applyOp, PlaylistOpError } from '@/domain/playlistOps';
import { type PlaylistContent, PlaylistName, type PlaylistOp } from '@/domain/playlists';
import cn from '@/lib/cn';
import { TOASTER_ID } from '@/player/toasts';
import {
  createDraftStore,
  type DraftState,
  type DraftStore,
  type Refusal,
  type Settled,
} from '@/playlists/store';
import { playlistTransport } from '@/playlists/transport';
import { useDraft } from '@/playlists/useDraft';
import type { PlaylistTrackGroupRow } from './blocks';
import {
  hasProseOwner,
  insertText,
  moveEntry,
  moveSegmentBy,
  moveToOwnGroup,
  moveToGroup,
  removeText,
  saveProse,
  sourceOf,
} from './editOps';
import PublishControl from './PublishControl';
import { type DragSource, dropOps } from './dragOps';
import MarkdownField, { type FieldAction } from './MarkdownField';
import PlaylistArticle, {
  MAX_ANIMATED_ROWS,
  type ArticleSlots,
  type ProseOwner,
} from './PlaylistArticle';
import {
  needsServer,
  PLAYLIST_PROSE,
  type PlaylistResolved,
  playlistView,
  unresolved,
} from './rows';
import { usePlaylistDrag } from './usePlaylistDrag';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from '@/ui/base/Menu';

// The editor (docs/playlist-editing.md): the read view's article, laid out from
// a draft, with menus on every cell, prose block and gap. Edits apply at once and
// save in the background (src/playlists/store.ts). Prose is edited as written, in
// a textarea; when the edits are saved the server renders the page again, so
// Markdown and timestamps show as readers will see them.

/** Reopened with the text as written, and why (the server refused it, or its block went). */
type Reopened = {
  draft?: string;
  error?: string;
  /** The waiting draft it shows (its own id: two can wait to reopen in one place). */
  waiting?: number;
};

/** The open text field, if any. */
type Editing =
  | ({ kind: 'prose'; owner: ProseOwner } & Reopened)
  /** New text, in the composer after a row (by key), or at the end ('end'). */
  | ({ kind: 'composer'; after: string; into?: string } & Reopened)
  | null;

/** Text sent from a field: where it was written, to reopen there if it's refused. */
type Sent = { from: NonNullable<Editing>; text: string };

/**
 * Text that didn't make it, waiting in its field, and why: refused as written (sent
 * again only once it's changed), or displaced (its block went: fine to send as is).
 */
type Unsent = Sent & { id: number; error?: string; refused: boolean };

const sameOwner = (a: ProseOwner, b: ProseOwner) =>
  a.kind === b.kind && (a.kind === 'playlist' || (b.kind !== 'playlist' && a.id === b.id));

/**
 * Whether a field still has somewhere to open: its block, or the row its composer
 * follows (and the group it was writing into, if it was).
 */
const stillThere = (content: PlaylistContent, from: NonNullable<Editing>) =>
  from.kind === 'prose'
    ? hasProseOwner(content, from.owner)
    : (from.into === undefined || content.segments.some((s) => s.id === from.into)) &&
      (from.after === 'end' ||
        from.after === '' ||
        content.segments.some(
          (s) => s.id === from.after || s.entries.some((e) => e.id === from.after)
        ));

const sameField = (a: Editing, b: NonNullable<Editing>) =>
  !!a &&
  (a.kind === 'prose'
    ? b.kind === 'prose' && sameOwner(a.owner, b.owner)
    : b.kind === 'composer' && a.after === b.after && a.into === b.into);

/**
 * The one removal toast. Its Undo undoes the top step, so it's dismissed as soon
 * as anything else becomes the top step (another edit, Undo) or the editor closes;
 * a second removal replaces it.
 */
const REMOVED_TOAST = 'playlist-removed';

const notify = (message: string) => toast.error(message, { toasterId: TOASTER_ID });

export default function PlaylistEditor({
  initial,
  resolved,
  viewHref,
  publicCode,
  takenDown,
  byline,
}: {
  initial: PlaylistContent;
  resolved: PlaylistResolved;
  /** The playlist's page: Done goes back there. */
  viewHref: string;
  /** Set while it's published. */
  publicCode?: string;
  takenDown: boolean;
  byline: ReactNode[];
}) {
  const router = useRouter();
  // One draft per playlist for as long as the page is open; the route keys this by id.
  const [store] = useState(() => createDraftStore(initial, { transport: playlistTransport }));
  const state = useDraft(store);
  // The field you opened. Text that didn't make it waits in `unsent`, oldest first,
  // and shows in its field when no other is open: a refusal never takes the place
  // of a field that's open (which would close it unfinished and send its text
  // again), so refusals can't chase each other.
  const [opened, setEditing] = useState<Editing>(null);
  const [unsent, setUnsent] = useState<Unsent[]>([]);
  const waiting = unsent[0];
  // Where it reopens is worked out now, not kept: its own field while that's still
  // there, else the composer at the end. (Kept, it went stale: a block deleted while
  // its draft waited left the draft nowhere to open, and nothing could close it.)
  const reopenAt: NonNullable<Editing> | null = waiting
    ? stillThere(state.content, waiting.from)
      ? waiting.from
      : { kind: 'composer', after: 'end' }
    : null;
  const editing: Editing =
    opened ??
    (waiting && reopenAt
      ? { ...reopenAt, draft: waiting.text, error: waiting.error, waiting: waiting.id }
      : null);
  const unsentCount = useRef(0);
  useEffect(() => {
    unsentCount.current = unsent.length;
  }, [unsent]);
  /**
   * Whether what's on screen is all saved, once what's on its way settles; if not,
   * why. The one check before Publish and Done: a save that failed or was refused,
   * or text waiting in its field (refused earlier, or its block gone).
   */
  const unsavedNow = async () =>
    unsavedReason(await store.settle()) ??
    (unsentCount.current
      ? 'Some text you wrote isn’t saved (it’s open, with why). Save or discard it first.'
      : null);
  // Each text edit sent, by the operation itself: the store hands refused
  // operations back as they were, so a refusal reopens the field it came from.
  const sent = useRef(new WeakMap<PlaylistOp, Sent>());
  // The fields holding text not yet handed over (the title, an open text field):
  // leaving the editor takes their text before deciding what's left to save.
  const openFieldsRef = useRef(new Set<() => void>());
  useStoreEvents(store, openFieldsRef, {
    // The server renders the page again only when something waits on it (see
    // `unresolved`), checked in the store's content as it is now: a conflict's
    // refetch lands in the same update as the save, before React renders it.
    onSaved: () => needsServer(unresolved(store.getState().content, resolved)) && router.refresh(),
    // Text that didn't make it (refused, or skipped because its block went elsewhere)
    // waits to reopen; where is worked out when it does (`reopenAt`).
    onRefused: (refused) => {
      for (const op of refused.ops) {
        const hit = sent.current.get(op);
        if (hit) wait({ ...hit, error: refused.error.detail, refused: refused.kind === 'refused' });
      }
    },
    // Closed (the nav bar, Back, a link) with a save on its way: once it's in, the
    // page now showing reads it again; if it didn't make it, say so.
    onClosed: (settled) => {
      const reason = unsavedReason(settled);
      if (reason) notify(reason);
      else router.refresh();
    },
  });
  // The server's render of saved edits on its way back (router.refresh()).
  const refreshing = usePendingNavigation((to, from) => to.href === from.href);

  /** Applies edits (as one undo step); an edit the server would refuse says why instead. */
  const edit = (...ops: (PlaylistOp | null)[]): PlaylistOp[] => {
    // A removal's toast undoes the top step: once anything else is, it's gone.
    toast.dismiss(REMOVED_TOAST);
    try {
      return store.edit(...ops.filter((op) => op !== null));
    } catch (err) {
      if (!(err instanceof PlaylistOpError)) throw err;
      notify(err.message);
      return [];
    }
  };
  const content = state.content;
  const root = useRef<HTMLDivElement>(null);
  useWarnBeforeLeaving(store, root, unsentCount);
  // Leaving within the site with text that didn't make it: say so (it's not saved).
  useEffect(
    () => () => {
      if (unsentCount.current) notify('Some text you wrote wasn’t saved.');
    },
    []
  );
  // What's being dragged: the flow lays out its drop zones while it is.
  const [dragging, setDragging] = useState<DragSource | null>(null);
  // Where the composer is: after a row's key ('end' for the Add zone at the end).
  const composerAt = editing?.kind === 'composer' ? editing.after : null;
  usePlaylistDrag({
    root,
    dragging,
    // A drop only where it would change something (no indicator elsewhere).
    canDrop: (source, target) => dropOps(content, source, target).length > 0,
    onDragChange: setDragging,
    // One drop can be two edits (text changing how it's stored): one undo step.
    onDrop: (source, target) => {
      const ops = dropOps(content, source, target);
      // Text moved as text is a copy placed, then the original removed. The copy is
      // registered like a field's save, so if its place is gone by the time it's
      // saved (another tab's edit, met on a replay), it comes back as a draft; and
      // the pair is only sent if the copy applies here, so the original never goes
      // without it.
      const [place] = ops;
      const text =
        source.kind === 'prose' && place && 'entries' in place.payload
          ? (place.payload.entries.find((e) => e.description)?.description ??
            ('description' in place.payload ? place.payload.description : undefined))
          : undefined;
      if (text) {
        if (applyOp(store.getState().content, place).status !== 'applied') return;
        sent.current.set(place, { from: { kind: 'composer', after: 'end' }, text });
      }
      edit(...ops);
    },
  });
  // Laid out from a deferred copy, so each edit commits as a transition and the
  // rows slide to their new places (ViewTransition in PlaylistArticle). Not a long
  // playlist: its rows don't animate, and its background render (slow, and
  // restarted by every urgent update, like playback's) could keep an edit off
  // screen, a closed field's text nowhere, for as long as it took.
  const deferred = useDeferredValue(content);
  const entries = content.segments.reduce((n, s) => n + Math.max(1, s.entries.length), 0);
  const shown = entries > MAX_ANIMATED_ROWS ? content : deferred;
  const view = playlistView(shown, resolved);
  const timestampTargets = view.rows.flatMap((r) =>
    r.kind === 'track'
      ? [{ entryId: r.id, title: r.trackTitle ?? 'Track', duration: r.songDuration ?? undefined }]
      : []
  );
  /**
   * Text that didn't make it, to wait (in order) to reopen in its field. Each is its
   * own draft: two can reopen in one place (the composer at the end) and both wait.
   */
  const drafts = useRef(0);
  const wait = (draft: Omit<Unsent, 'id'>) => {
    const { kind } = draft.from;
    // Where it reopens (and, for new text, the group it was going into), without
    // what it carried when it was last open.
    const from: NonNullable<Editing> =
      kind === 'prose'
        ? { kind, owner: draft.from.owner }
        : { kind, after: draft.from.after, into: draft.from.into };
    const id = ++drafts.current;
    setUnsent((list) => [...list, { ...draft, from, id }]);
  };

  /**
   * The one way a field's text reaches the playlist, however the field closes:
   * finished (blur, ⌘↵, a toolbar action), interrupted (another field opened, its
   * block went, the editor closed), or discarded (Escape: `text` null). Where it
   * lands is decided against the store's content as it is now, not the last
   * render's, and the store says whether the edit applied. Text that can't land
   * (its block, or the section it was going into, is gone) isn't dropped: it waits
   * as a draft, visibly, until it's sent or discarded. So text is always either
   * saved, waiting, or discarded on purpose.
   */
  const commitText = (
    from: NonNullable<Editing>,
    text: string | null,
    how: 'finished' | 'interrupted',
    /** The edit for `text`, against `now`: null for no change, 'gone' for nowhere to go. */
    toOp: (now: PlaylistContent, text: string) => PlaylistOp | null | 'gone'
  ) => {
    const close = () => setEditing((open) => (sameField(open, from) ? null : open));
    // The waiting draft this field shows, if it shows one.
    const draft =
      from.waiting === undefined ? undefined : unsent.find((u) => u.id === from.waiting);
    // Unchanged, a draft keeps waiting: closed unfinished, or refused as written
    // (the server would only refuse it again).
    if (draft && text === draft.text && (how === 'interrupted' || draft.refused)) return close();
    // Closed: it's done waiting (sent, kept anew below, or discarded).
    if (draft) setUnsent((list) => list.filter((u) => u.id !== draft.id));
    close();
    if (text === null) return;
    const op = toOp(store.getState().content, text);
    if (op === null) return;
    if (op !== 'gone' && edit(op).includes(op)) {
      sent.current.set(op, { from, text });
      return;
    }
    if (text.trim())
      wait({
        from,
        text,
        error: 'What you were editing was removed. Your text is here.',
        refused: false,
      });
  };

  const removed = (what: string, op: PlaylistOp) => {
    edit(op);
    toast(`Removed ${what}`, {
      id: REMOVED_TOAST,
      toasterId: TOASTER_ID,
      action: { label: 'Undo', onClick: () => store.undo() },
    });
  };
  const undo = () => {
    toast.dismiss(REMOVED_TOAST);
    store.undo();
  };
  // Nor does it outlive the editor.
  useEffect(() => () => void toast.dismiss(REMOVED_TOAST), []);
  // The groups a track can move into (each box: two or more entries, or writing).
  const groups = content.segments.filter(
    (s) => s.entries.length > 1 || (s.description && s.entries.length > 0)
  );
  /** A group's name in a menu: its intro's first line, else its first track's title. */
  const groupName = (segmentId: string) =>
    firstLine(content.segments.find((s) => s.id === segmentId)?.description) ||
    view.rows.flatMap((r) => (r.segmentId === segmentId && r.kind === 'track' ? [r] : []))[0]
      ?.trackTitle ||
    'Group';

  /**
   * What a text block's field offers besides editing (its block has no menu, so
   * nothing takes room beside it): moves, and removal. A move saves the text first;
   * a removal discards it.
   */
  const proseActions = (owner: ProseOwner): FieldAction[] => {
    if (owner.kind === 'segment')
      return [
        {
          label: 'Remove Intro',
          icon: Trash2Icon,
          discard: true,
          run: () => edit(saveProse(content, owner, '')),
        },
      ];
    if (owner.kind !== 'text') return [];
    const alone = content.segments.some((seg) => seg.id === owner.id);
    const by = (d: -1 | 1) =>
      alone ? moveSegmentBy(content, owner.id, d) : moveEntry(content, owner.id, d);
    const up = by(-1);
    const down = by(1);
    return [
      { label: 'Move Up', icon: ArrowUpIcon, disabled: !up, run: () => edit(up) },
      { label: 'Move Down', icon: ArrowDownIcon, disabled: !down, run: () => edit(down) },
      {
        label: 'Remove',
        icon: Trash2Icon,
        discard: true,
        run: () => removed('the text', removeText(content, owner.id)),
      },
    ];
  };

  const slots: ArticleSlots = {
    title: (
      <TitleInput
        openFieldsRef={openFieldsRef}
        name={content.name}
        onSave={(name) => {
          const parsed = PlaylistName.safeParse(name);
          if (!parsed.success) return notify(parsed.error.issues[0]?.message ?? 'Check the name.');
          if (parsed.data !== content.name)
            edit({ operation_type: 'update_metadata', payload: { name: parsed.data } });
        }}
      />
    ),

    prose: (owner) => {
      if (editing?.kind !== 'prose') return undefined;
      const open = editing;
      const field = (target: ProseOwner, label: string) => {
        const from = { kind: 'prose', owner: target, waiting: open.waiting } as const;
        const toProse = (now: PlaylistContent, text: string) =>
          hasProseOwner(now, target) ? saveProse(now, target, text) : 'gone';
        return (
          <MarkdownField
            // A fresh field per draft: the next one waiting doesn't inherit this one's text.
            key={open.waiting ?? 'open'}
            openFieldsRef={openFieldsRef}
            actions={proseActions(target)}
            label={label}
            initial={open.draft ?? sourceOf(content, target)}
            error={open.error}
            limit={target.kind === 'playlist' ? 1000 : 2000}
            timestampTargets={timestampTargets}
            ownEntryId={target.kind === 'note' ? target.id : undefined}
            onDone={(text) => commitText(from, text, 'finished', toProse)}
            onInterrupted={(text) => commitText(from, text, 'interrupted', toProse)}
          />
        );
      };
      if (!sameOwner(editing.owner, owner)) return undefined;
      return field(owner, owner.kind === 'segment' ? 'Intro' : 'Text');
    },

    editProse: (owner) => setEditing({ kind: 'prose', owner }),

    // Waiting on the server's render, unless saving it failed (the toolbar says so).
    prosePending: (owner) =>
      state.status !== 'error' &&
      view.unresolved.prose.includes(owner.kind === 'playlist' ? PLAYLIST_PROSE : owner.id),

    // A card's Edit menu, in the read view's ⋯ place.
    cellMenu: (row) => (
      <CellMenu
        row={row}
        groups={groups.filter((s) => s.id !== row.segmentId)}
        hasNote={!!row.description}
        onNote={() => setEditing({ kind: 'prose', owner: { kind: 'note', id: row.id } })}
        onIntro={() => setEditing({ kind: 'prose', owner: { kind: 'segment', id: row.segmentId } })}
        onAddBelow={() => setEditing({ kind: 'composer', after: row.id })}
        onEdit={(op) => edit(op)}
        // Worked out when the menu opens, not for every row on every render.
        moves={() => ({
          up: moveEntry(content, row.id, -1),
          down: moveEntry(content, row.id, 1),
          ownGroup: moveToOwnGroup(content, row.id),
        })}
        onRemove={() =>
          removed('the track', { operation_type: 'delete_entry', payload: { entry_id: row.id } })
        }
        moveToGroup={(segmentId) => moveToGroup(row.id, segmentId)}
        groupName={groupName}
      />
    ),

    // A section's or group's menu, at its box's corner.
    // A group's Add Text: the composer at its end, the text going into it.
    addText: ({ segmentId, after }) => setEditing({ kind: 'composer', after, into: segmentId }),

    boxMenu: ({ segmentId }) => (
      <BoxMenu
        hasIntro={!!content.segments.find((s) => s.id === segmentId)?.description}
        moves={() => ({
          up: moveSegmentBy(content, segmentId, -1),
          down: moveSegmentBy(content, segmentId, 1),
        })}
        onEdit={(op) => edit(op)}
        onIntro={() => setEditing({ kind: 'prose', owner: { kind: 'segment', id: segmentId } })}
        onRemove={() =>
          removed('the group', {
            operation_type: 'delete_segment',
            payload: { segment_id: segmentId },
          })
        }
      />
    ),

    // What dragging a row or box moves, and its drag image's label.
    drag: (target) => {
      if ('rows' in target)
        return target.segmentId && target.tone
          ? {
              source: { kind: 'segment', id: target.segmentId },
              label: 'Group',
            }
          : undefined;
      if (target.kind === 'track')
        return {
          source: { kind: 'entry', id: target.row.id },
          label:
            target.row.kind === 'track' ? (target.row.trackTitle ?? 'Track') : 'Unavailable track',
        };
      if (target.kind === 'prose' && target.owner.kind !== 'playlist')
        return { source: target.drag, label: firstLine(sourceOf(content, target.owner)) || 'Text' };
      return undefined;
    },

    flow: {
      // The Add zone at the end is always there; elsewhere the composer is laid out.
      insertAfter: composerAt !== null && composerAt !== 'end' ? composerAt : null,
      insertInto: editing?.kind === 'composer' ? (editing.into ?? null) : null,
      // A group's (or lone track's) first intro: laid out where it will show.
      intro:
        editing?.kind === 'prose' && editing.owner.kind === 'segment' ? editing.owner.id : null,
    },

    gap: (at) => {
      // The composer's row, or the Add zone at the end.
      const open =
        editing?.kind === 'composer' && editing.after === at.key && editing.into === at.into
          ? editing
          : null;
      // New text where the composer is: if what it was going into is gone by then, the
      // edit doesn't apply, and commitText keeps it.
      const done = (text: string | null, how: 'finished' | 'interrupted') =>
        commitText(
          { kind: 'composer', after: at.key, into: at.into, waiting: open?.waiting },
          text,
          how,
          (now, t) => insertText(now, at, t)
        );
      return {
        control:
          at.key === 'end' ? (
            <GapControl onAddText={() => setEditing({ kind: 'composer', after: 'end' })} />
          ) : undefined,
        content: open ? (
          <MarkdownField
            // A fresh field per draft: the next one waiting doesn't inherit this one's text.
            key={open.waiting ?? 'open'}
            openFieldsRef={openFieldsRef}
            label="New text"
            initial={open.draft ?? ''}
            error={open.error}
            limit={2000}
            timestampTargets={timestampTargets}
            onDone={(text) => done(text, 'finished')}
            onInterrupted={(text) => done(text, 'interrupted')}
          />
        ) : undefined,
      };
    },

    toolbar: (
      <div className="flex items-center gap-2 text-sm">
        <SaveStatus state={state} refreshing={refreshing} onRetry={() => store.retry()} />
        {!content.description && (
          <button
            type="button"
            onClick={() => setEditing({ kind: 'prose', owner: { kind: 'playlist' } })}
            className={TOOL}
          >
            <TextIcon className="size-4" aria-hidden />
            Add Description
          </button>
        )}
        <button type="button" onClick={undo} disabled={!state.canUndo} className={TOOL}>
          <UndoIcon className="size-4" aria-hidden />
          Undo
        </button>
      </div>
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <EditingNotice />
      {/* What's being dragged fades where it was. */}
      <div ref={root} className="[&_[data-dragging]]:opacity-40">
        <PlaylistArticle
          view={view}
          byline={byline}
          slots={slots}
          actions={
            <>
              <PublishControl
                beforePublish={unsavedNow}
                playlistId={initial.playlistId}
                publicCode={publicCode}
                takenDown={takenDown}
              />
              <Link
                href={viewHref}
                // With a save on its way, the playlist's page would read the old
                // version: wait for it. With anything unsaved, stay, saying why.
                onNavigate={(e) => {
                  if (store.getState().status === 'saved' && !unsent.length) return;
                  e.preventDefault();
                  void unsavedNow().then((reason) =>
                    reason ? notify(reason) : router.push(viewHref)
                  );
                }}
                className="header-action-primary"
              >
                Done
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}

/** Above the playlist, so there's no mistaking the editor for the page. */
function EditingNotice() {
  return (
    <p
      className="
        mb-0 flex items-center gap-2.5 rounded-xl bg-accent/10 px-4 py-3 text-sm
        text-text-secondary ring-1 ring-accent/40
      "
    >
      <PencilIcon className="size-4 shrink-0 text-accent" aria-hidden />
      <span>
        <strong className="font-semibold text-text-primary">You’re editing this playlist.</strong>{' '}
        Changes save automatically.
      </span>
    </p>
  );
}

const firstLine = (text?: string) => (text ?? '').split('\n')[0].slice(0, 40);

const TOOL = `
  inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-sm
  font-medium text-text-secondary transition-colors hover:bg-surface-hover
  hover:text-text-primary disabled:opacity-40 disabled:hover:bg-transparent
`;

/**
 * Why what's on screen isn't what the server has, once a save settles: null when
 * it is. The one answer for everything that needs the server caught up (Publish,
 * Done, the editor closing).
 */
function unsavedReason(settled: Settled): string | null {
  switch (settled.kind) {
    case 'saved':
      return null;
    case 'refused':
      return `Your latest edit wasn’t saved: ${settled.refusal.error.detail ?? 'it was refused'}.`;
    case 'failed':
      return settled.error.kind === 'signed-out'
        ? 'Your latest edits aren’t saved: sign in, then Retry.'
        : 'Your latest edits aren’t saved yet. Retry them first.';
  }
}

/**
 * Calls back when the draft's edits are all saved (the server renders the page
 * again), when the server refuses some (422), and when the editor closes with a
 * save still on its way, once it settles (Done is a client navigation, as are
 * the nav bar and Back: beforeunload sees none of them).
 */
function useStoreEvents(
  store: DraftStore,
  openFieldsRef: RefObject<Set<() => void>>,
  handlers: {
    onSaved: () => void;
    onRefused: (refused: Refusal) => void;
    onClosed: (settled: Settled) => void;
  }
) {
  const onSaved = useEffectEvent(handlers.onSaved);
  const onRefused = useEffectEvent(handlers.onRefused);
  const onClosed = useEffectEvent(handlers.onClosed);
  useEffect(() => {
    let previous = store.getState();
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.status === 'saved' && previous.status !== 'saved') onSaved();
      if (state.refused && state.refused !== previous.refused) onRefused(state.refused);
      previous = state;
    });
    return () => {
      unsubscribe();
      // Open fields' text first (unmount order doesn't decide it), then whatever is
      // still on its way.
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- the fields open now, on purpose
      for (const handOver of openFieldsRef.current) handOver();
      if (store.getState().status !== 'saved') void store.settle().then(onClosed);
    };
  }, [store, openFieldsRef]);
}

/** Asks before leaving with edits not yet saved. */
/**
 * Asks before leaving the page (a reload, closing the tab) with anything unsaved:
 * edits not yet saved, or text typed into a field that hasn't closed (fields
 * commit when they close, and unloading the page closes nothing). Decided when
 * leaving, from the store and the fields themselves (an uncontrolled field's
 * value against its defaultValue), so nothing needs reporting as it's typed.
 */
function useWarnBeforeLeaving(
  store: DraftStore,
  root: RefObject<HTMLElement | null>,
  /** Drafts that didn't make it (refused), waiting: unsaved too. */
  unsentCount: RefObject<number>
) {
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const typing = [...(root.current?.querySelectorAll('textarea') ?? [])].some(
        (t) => t.value !== t.defaultValue
      );
      if (store.getState().status !== 'saved' || typing || unsentCount.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [store, root, unsentCount]);
}

function SaveStatus({
  state,
  refreshing,
  onRetry,
}: {
  state: DraftState;
  /** Saved, and the server's render of it is on its way. */
  refreshing: boolean;
  onRetry: () => void;
}) {
  if (state.status === 'error') {
    const kind = state.error?.kind;
    const message =
      kind === 'signed-out'
        ? 'Signed out: sign in to save'
        : kind === 'archived'
          ? 'Archived playlists can’t be edited'
          : 'Couldn’t save';
    return (
      <span role="status" className="flex items-center gap-2 text-red-500">
        {message}
        {kind !== 'archived' && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Retry
          </button>
        )}
      </span>
    );
  }
  return (
    <span role="status" className={state.refused ? 'text-red-500' : 'text-text-muted'}>
      {state.status === 'saving' || refreshing
        ? 'Saving…'
        : // Refused, though nothing's left unsaved: say why until the next edit.
          state.refused
          ? (state.refused.error.detail ?? 'That edit was refused')
          : 'Saved'}
    </span>
  );
}

/** The title, as an input that looks like it. Saves on Enter or blur; Escape reverts. */
function TitleInput({
  name,
  onSave,
  openFieldsRef,
}: {
  name: string;
  onSave: (name: string) => void;
  /** The editor's open fields: a name typed but not yet saved is handed over when it closes. */
  openFieldsRef: RefObject<Set<() => void>>;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const save = useEffectEvent(onSave);
  // The name the field last showed as saved. A new one (yours, saved; or someone
  // else's, from a conflict's refetch) replaces what it shows, unless you're
  // typing in it: then what you've typed stays, to be saved as usual.
  const shown = useRef(name);
  useEffect(() => {
    const t = field.current;
    if (!t) return;
    const typing = document.activeElement === t && t.value !== shown.current;
    if (!typing) t.value = name;
    shown.current = name;
  }, [name]);
  useEffect(() => {
    // The element, kept (React clears the ref before the editor's cleanup runs).
    const t = field.current;
    const open = openFieldsRef.current;
    if (!t) return;
    const handOver = () => {
      if (t.value !== shown.current) save(t.value.replace(/\s+/g, ' '));
    };
    open.add(handOver);
    return () => void open.delete(handOver);
  }, [openFieldsRef]);
  return (
    // A one-row textarea that grows, so a long name wraps like the heading does.
    // Enter saves (a name is one line); Escape reverts.
    <textarea
      ref={field}
      defaultValue={name}
      aria-label="Playlist name"
      maxLength={100}
      rows={1}
      onBlur={(e) => onSave(e.currentTarget.value.replace(/\s+/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          e.currentTarget.value = name;
          e.currentTarget.blur();
        }
      }}
      className="
        -mx-1 block [field-sizing:content] w-full resize-none overflow-hidden rounded-md
        bg-transparent px-1 text-balance outline-none hover:bg-text-primary/[0.04]
        focus:bg-text-primary/[0.04] focus:ring-1 focus:ring-accent
      "
    />
  );
}

/** A ⋯ menu for the editor, faded until its block is hovered (always on touch). */
function EditMenu({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <MenuRoot>
      <MenuTrigger
        aria-label={label}
        className={cn(
          `
            inline-flex size-8 items-center justify-center rounded-md text-text-muted opacity-0
            transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100
            hover:bg-surface-hover hover:text-text-primary focus-visible:opacity-100
            data-popup-open:opacity-100 pointer-coarse:opacity-100
          `,
          className
        )}
      >
        <EllipsisVerticalIcon className="size-4" aria-hidden />
      </MenuTrigger>
      <MenuContent align="end">{children}</MenuContent>
    </MenuRoot>
  );
}

type Moves = { up: PlaylistOp | null; down: PlaylistOp | null; ownGroup: PlaylistOp | null };

/** A group's own menu, at its box's corner: move it, give it an intro, remove it. */
function BoxMenu({
  hasIntro,
  moves,
  onEdit,
  onIntro,
  onRemove,
}: {
  /** Whether it has an intro yet. */
  hasIntro: boolean;
  moves: () => Pick<Moves, 'up' | 'down'>;
  onEdit: (op: PlaylistOp | null) => void;
  onIntro: () => void;
  onRemove: () => void;
}) {
  const noun = 'Group';
  return (
    <EditMenu label={`Edit ${noun.toLowerCase()}`}>
      {!hasIntro && (
        <MenuItem icon={TextIcon} onClick={onIntro}>
          Add Intro
        </MenuItem>
      )}
      <BoxMoveItems moves={moves} onEdit={onEdit} noun={noun} />
      <MenuSeparator />
      <MenuItem icon={Trash2Icon} onClick={onRemove}>
        Remove {noun} and Tracks
      </MenuItem>
    </EditMenu>
  );
}

/** Rendered (and worked out) only while the menu is open. */
function BoxMoveItems({
  moves,
  onEdit,
  noun,
}: {
  moves: () => Pick<Moves, 'up' | 'down'>;
  onEdit: (op: PlaylistOp | null) => void;
  noun: string;
}) {
  const { up, down } = moves();
  return (
    <>
      <MenuItem icon={ArrowUpIcon} onClick={() => onEdit(up)} disabled={!up}>
        {noun ? `Move ${noun} Up` : 'Move Up'}
      </MenuItem>
      <MenuItem icon={ArrowDownIcon} onClick={() => onEdit(down)} disabled={!down}>
        {noun ? `Move ${noun} Down` : 'Move Down'}
      </MenuItem>
    </>
  );
}

/** Move Up, Move Down, Move to Its Own Group: rendered (and worked out) only while the menu is open. */
function MoveItems({
  moves,
  onEdit,
}: {
  moves: () => Moves;
  onEdit: (op: PlaylistOp | null) => void;
}) {
  const { up, down, ownGroup } = moves();
  return (
    <>
      <MenuItem icon={ArrowUpIcon} onClick={() => onEdit(up)} disabled={!up}>
        Move Up
      </MenuItem>
      <MenuItem icon={ArrowDownIcon} onClick={() => onEdit(down)} disabled={!down}>
        Move Down
      </MenuItem>
      {ownGroup && (
        <MenuItem icon={GroupIcon} onClick={() => onEdit(ownGroup)}>
          Move to Its Own Group
        </MenuItem>
      )}
    </>
  );
}

function CellMenu({
  row,
  groups,
  hasNote,
  onNote,
  onIntro,
  onAddBelow,
  onEdit,
  moves,
  moveToGroup,
  groupName,
  onRemove,
}: {
  row: PlaylistTrackGroupRow;
  groups: { id: string }[];
  hasNote: boolean;
  onNote: () => void;
  onIntro: () => void;
  onAddBelow: () => void;
  onEdit: (op: PlaylistOp | null) => void;
  moves: () => Moves;
  moveToGroup: (segmentId: string) => PlaylistOp;
  groupName: (segmentId: string) => string;
  onRemove: () => void;
}) {
  return (
    <EditMenu label={`Edit ${row.kind === 'track' ? (row.trackTitle ?? 'track') : 'track'}`}>
      <MenuItem icon={PencilIcon} onClick={onNote}>
        {hasNote ? 'Edit Note' : 'Add Note'}
      </MenuItem>
      {!row.segment && (
        <MenuItem icon={TextIcon} onClick={onIntro}>
          Add Intro
        </MenuItem>
      )}
      <MenuItem icon={PlusIcon} onClick={onAddBelow}>
        Add Text Below
      </MenuItem>
      <MenuSeparator />
      <MoveItems moves={moves} onEdit={onEdit} />
      {groups.length > 0 && (
        <MenuSubmenuRoot>
          <MenuSubmenuTrigger icon={GroupIcon}>Move to Group</MenuSubmenuTrigger>
          <MenuContent>
            {groups.map((s) => (
              <MenuItem
                key={s.id}

                onClick={() => onEdit(moveToGroup(s.id))}
              >
                <span className="truncate">{groupName(s.id)}</span>
              </MenuItem>
            ))}
          </MenuContent>
        </MenuSubmenuRoot>
      )}
      <MenuSeparator />
      <MenuItem icon={Trash2Icon} onClick={onRemove}>
        Remove
      </MenuItem>
    </EditMenu>
  );
}

/** The Add zone at the end: click anywhere in it to write there. */
function GapControl({ onAddText }: { onAddText: () => void }) {
  return (
    <button
      type="button"
      onClick={onAddText}
      className="
        flex w-full items-center gap-2 rounded-[inherit] py-2
        pl-[calc(var(--spacing-flow-indent)-1px)] text-sm text-text-muted
        transition-colors hover:bg-text-primary/[0.03] hover:text-text-primary
        focus-visible:outline-2 focus-visible:outline-accent
      "
    >
      <PlusIcon className="-ml-6 size-4" aria-hidden />
      Add Text
    </button>
  );
}
