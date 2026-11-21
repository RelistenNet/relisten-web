'use client';

import { Menu } from '@base-ui/react/menu';
import { Link, usePendingNavigation, useRouter } from '@timber-js/app/client';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  GripVerticalIcon,
  GroupIcon,
  PencilIcon,
  PlusIcon,
  TextIcon,
  Trash2Icon,
  UndoIcon,
} from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  startTransition,
  useState,
} from 'react';
import { toast } from 'sonner';
import { PlaylistOpError } from '@/domain/playlistOps';
import { type PlaylistContent, PlaylistName, type PlaylistOp } from '@/domain/playlists';
import cn from '@/lib/cn';
import { MENU_ITEM, MENU_POPUP } from '@/player/menuStyles';
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
  moveToSection,
  removeText,
  saveProse,
  sourceOf,
} from './editOps';
import PublishControl from './PublishControl';
import { type DragSource, dropOps } from './dragOps';
import MarkdownField from './MarkdownField';
import PlaylistArticle, { ACTION, type ArticleSlots, type ProseOwner } from './PlaylistArticle';
import {
  needsServer,
  PLAYLIST_PROSE,
  type PlaylistResolved,
  playlistView,
  unresolved,
} from './rows';
import { draggableBlock, usePlaylistDrag } from './usePlaylistDrag';

// The editor (docs/playlist-editing.md): the read view's article, laid out from
// a draft, with menus on every cell, prose block and gap. Edits apply at once and
// save in the background (src/playlists/store.ts). Prose is edited as written, in
// a textarea; when the edits are saved the server renders the page again, so
// Markdown and timestamps show as readers will see them.

/** Reopened with the text as written, and why (the server refused it, or its block went). */
type Reopened = { draft?: string; error?: string };

/** The open text field, if any. */
type Editing =
  | ({ kind: 'prose'; owner: ProseOwner } & Reopened)
  /** New text, in the composer after a row (by key), or at the end ('end'). */
  | ({ kind: 'composer'; after: string } & Reopened)
  | null;

/** Text sent from a field: where it was written, to reopen there if it's refused. */
type Sent = { from: NonNullable<Editing>; text: string };

const sameOwner = (a: ProseOwner, b: ProseOwner) =>
  a.kind === b.kind && (a.kind === 'playlist' || (b.kind !== 'playlist' && a.id === b.id));

const sameField = (a: Editing, b: NonNullable<Editing>) =>
  !!a &&
  (a.kind === 'prose'
    ? b.kind === 'prose' && sameOwner(a.owner, b.owner)
    : b.kind === 'composer' && a.after === b.after);

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
  const [editing, setEditing] = useState<Editing>(null);
  // Each text edit sent, by the operation itself: the store hands refused
  // operations back as they were, so a refusal reopens the field it came from.
  const sent = useRef(new WeakMap<PlaylistOp, Sent>());
  useStoreEvents(store, {
    // The server renders the page again only when something waits on it (see
    // `unresolved`), checked in the store's content as it is now: a conflict's
    // refetch lands in the same update as the save, before React renders it.
    onSaved: () => needsServer(unresolved(store.getState().content, resolved)) && router.refresh(),
    onRefused: (refused) => {
      const hit = refused.ops.map((op) => sent.current.get(op)).find(Boolean);
      if (hit) setEditing({ ...hit.from, draft: hit.text, error: refused.error.detail });
    },
    // Closed (the nav bar, Back, a link) with a save on its way: once it's in, the
    // page now showing reads it again; if it didn't make it, say so.
    onClosed: (settled) => {
      const reason = unsavedReason(settled);
      if (reason) notify(reason);
      else router.refresh();
    },
  });
  useWarnBeforeLeaving(state);
  // The server's render of saved edits on its way back (router.refresh()).
  const refreshing = usePendingNavigation((to, from) => to.href === from.href);

  /** Applies edits (as one undo step); an edit the server would refuse says why instead. */
  const edit = (...ops: (PlaylistOp | null)[]) => {
    // A removal's toast undoes the top step: once anything else is, it's gone.
    toast.dismiss(REMOVED_TOAST);
    try {
      store.edit(...ops.filter((op) => op !== null));
    } catch (err) {
      if (err instanceof PlaylistOpError) notify(err.message);
      else throw err;
    }
  };
  const content = state.content;
  const root = useRef<HTMLDivElement>(null);
  // What's being dragged: the flow lays out its drop zones while it is.
  const [dragging, setDragging] = useState<DragSource | null>(null);
  // Where the composer is: after a row's key ('end' for the Add zone at the end).
  const composerAt = editing?.kind === 'composer' ? editing.after : null;
  usePlaylistDrag({
    root,
    dragging,
    // Zones open at once (they animate in by CSS); they close as a transition, so the
    // rows slide back together (the drag is over by then).
    onDragChange: (source) =>
      source ? setDragging(source) : startTransition(() => setDragging(null)),
    // One drop can be two edits (text changing how it's stored): one undo step.
    onDrop: (source, target) => edit(...dropOps(content, source, target)),
  });
  // Laid out from a deferred copy, so each edit commits as a transition and the
  // rows slide to their new places (ViewTransition in PlaylistArticle).
  const shown = useDeferredValue(content);
  const view = playlistView(shown, resolved);
  const timestampTargets = view.rows.flatMap((r) =>
    r.kind === 'track'
      ? [{ entryId: r.id, title: r.trackTitle ?? 'Track', duration: r.songDuration ?? undefined }]
      : []
  );
  /** Sends prose once its field closes, remembering where it came from in case it's refused. */
  const commitProse = (from: NonNullable<Editing>, text: string | null, op: PlaylistOp | null) => {
    // Closes this field, unless another has opened meanwhile (a refusal reopening one).
    setEditing((open) => (sameField(open, from) ? null : open));
    if (text === null || !op) return;
    sent.current.set(op, { from, text });
    edit(op);
  };
  /**
   * A field closed without being finished because its block went (an undo, or
   * someone else's edit): its text is kept, in the composer at the end.
   */
  const keepText = (text: string) =>
    setEditing(
      text.trim()
        ? {
            kind: 'composer',
            after: 'end',
            draft: text,
            error: 'What you were editing was removed. Your text is here.',
          }
        : null
    );

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
  const sections = content.segments.filter((s) => s.description && s.entries.length > 0);

  const slots: ArticleSlots = {
    title: (
      <TitleInput
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
      const field = (target: ProseOwner, label: string) => (
        <MarkdownField
          label={label}
          initial={open.draft ?? sourceOf(content, target)}
          error={open.error}
          limit={target.kind === 'playlist' ? 1000 : 2000}
          timestampTargets={timestampTargets}
          ownEntryId={target.kind === 'note' ? target.id : undefined}
          onDone={(text) =>
            commitProse(
              { kind: 'prose', owner: target },
              text,
              text === null ? null : saveProse(content, target, text)
            )
          }
          onInterrupted={(text) =>
            hasProseOwner(content, target)
              ? commitProse(
                  { kind: 'prose', owner: target },
                  text,
                  saveProse(content, target, text)
                )
              : keepText(text)
          }
        />
      );
      if (!sameOwner(editing.owner, owner)) return undefined;
      return field(owner, owner.kind === 'segment' ? 'Section intro' : 'Text');
    },

    editProse: (owner) => setEditing({ kind: 'prose', owner }),

    // Waiting on the server's render, unless saving it failed (the toolbar says so).
    prosePending: (owner) =>
      state.status !== 'error' &&
      view.unresolved.prose.includes(owner.kind === 'playlist' ? PLAYLIST_PROSE : owner.id),

    // Every row's grip and menu, in the same corner (PlaylistArticle places them).
    controls: (row) => {
      switch (row.kind) {
        case 'track':
          return (
            <>
              <Grip
                drag={{ kind: 'entry', id: row.row.id }}
                label={
                  row.row.kind === 'track' ? (row.row.trackTitle ?? 'Track') : 'Unavailable track'
                }
              />
              <CellMenu
                row={row.row}
                sections={sections.filter((s) => s.id !== row.row.segmentId)}
                hasNote={!!row.row.description}
                onNote={() =>
                  setEditing({ kind: 'prose', owner: { kind: 'note', id: row.row.id } })
                }
                onIntro={() =>
                  setEditing({ kind: 'prose', owner: { kind: 'segment', id: row.row.segmentId } })
                }
                onAddBelow={() => setEditing({ kind: 'composer', after: row.row.id })}
                onEdit={(op) => edit(op)}
                // Worked out when the menu opens, not for every row on every render.
                moves={() => ({
                  up: moveEntry(content, row.row.id, -1),
                  down: moveEntry(content, row.row.id, 1),
                  ownGroup: moveToOwnGroup(content, row.row.id),
                })}
                onRemove={() =>
                  removed('the track', {
                    operation_type: 'delete_entry',
                    payload: { entry_id: row.row.id },
                  })
                }
                moveToSection={(segmentId) => moveToSection(row.row.id, segmentId)}
                sectionName={(segmentId) =>
                  firstLine(content.segments.find((s) => s.id === segmentId)?.description) ||
                  'Section'
                }
              />
            </>
          );
        case 'prose': {
          const owner = row.owner;
          const comment = owner.kind === 'segment';
          return (
            <>
              <Grip drag={row.drag} label={firstLine(sourceOf(content, owner)) || 'Text'} />
              <EditMenu label={comment ? 'Edit section intro' : 'Edit text'}>
                <Item icon={PencilIcon} onClick={() => setEditing({ kind: 'prose', owner })}>
                  Edit
                </Item>
                {/* Moves, like a track's: a text entry among its group's entries, text
                standing alone among the segments. (A section's intro moves with it.) */}
                {!comment && (
                  <BoxMoveItems
                    noun=""
                    onEdit={(op) => edit(op)}
                    moves={() => {
                      const drag = row.drag;
                      const by = (d: -1 | 1) =>
                        drag.kind === 'entry'
                          ? moveEntry(content, drag.id, d)
                          : moveSegmentBy(content, drag.id, d);
                      return { up: by(-1), down: by(1) };
                    }}
                  />
                )}
                <Item
                  icon={Trash2Icon}
                  onClick={() =>
                    comment
                      ? edit(saveProse(content, owner, ''))
                      : owner.kind === 'text' && removed('the text', removeText(content, owner.id))
                  }
                >
                  {comment ? 'Remove Intro' : 'Remove'}
                </Item>
              </EditMenu>
            </>
          );
        }
        case 'header':
          return (
            <>
              <Grip
                drag={{ kind: 'segment', id: row.segmentId }}
                label={row.tone === 'section' ? 'Section' : 'Group'}
              />
              <BoxMenu
                tone={row.tone}
                moves={() => ({
                  up: moveSegmentBy(content, row.segmentId, -1),
                  down: moveSegmentBy(content, row.segmentId, 1),
                })}
                onEdit={(op) => edit(op)}
                onIntro={() =>
                  setEditing({ kind: 'prose', owner: { kind: 'segment', id: row.segmentId } })
                }
                onRemove={() =>
                  removed(row.tone === 'section' ? 'the section' : 'the group', {
                    operation_type: 'delete_segment',
                    payload: { segment_id: row.segmentId },
                  })
                }
              />
            </>
          );
        default:
          return null;
      }
    },

    flow: {
      dragging,
      // The Add zone at the end is always there; elsewhere the composer is laid out.
      insertAfter: composerAt !== null && composerAt !== 'end' ? composerAt : null,
      // A group's (or lone track's) first intro: laid out where it will show.
      intro:
        editing?.kind === 'prose' && editing.owner.kind === 'segment' ? editing.owner.id : null,
    },

    gap: (at) => {
      // The composer's row, or the Add zone at the end.
      const open = editing?.kind === 'composer' && editing.after === at.key ? editing : null;
      const done = (text: string | null) =>
        commitProse(
          { kind: 'composer', after: at.key },
          text,
          text === null ? null : insertText(content, at, text)
        );
      return {
        control:
          at.key === 'end' ? (
            <GapControl onAddText={() => setEditing({ kind: 'composer', after: 'end' })} />
          ) : undefined,
        content: open ? (
          <MarkdownField
            label="New text"
            initial={open.draft ?? ''}
            error={open.error}
            limit={2000}
            timestampTargets={timestampTargets}
            onDone={done}
            onInterrupted={done}
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
    // What's being dragged fades where it was.
    <div ref={root} className="[&_[data-dragging]]:opacity-40">
      <PlaylistArticle
        view={view}
        byline={byline}
        slots={slots}
        actions={
          <>
            <PublishControl
              beforePublish={() => store.settle().then(unsavedReason)}
              playlistId={initial.playlistId}
              publicCode={publicCode}
              takenDown={takenDown}
            />
            <Link
              href={viewHref}
              // With a save on its way, the playlist's page would read the old
              // version: wait for it, and stay (saying why) if it doesn't make it.
              onNavigate={(e) => {
                if (store.getState().status === 'saved') return;
                e.preventDefault();
                void store.settle().then((settled) => {
                  const reason = unsavedReason(settled);
                  if (reason) notify(reason);
                  else router.push(viewHref);
                });
              }}
              className={cn(ACTION, 'border-transparent bg-accent/15 hover:bg-accent/25')}
            >
              Done
            </Link>
          </>
        }
      />
    </div>
  );
}

/**
 * Shows a block can be dragged, and makes it so: the block drags from anywhere on
 * it. The menus are the keyboard's way.
 */
function Grip({ drag, label }: { drag: DragSource; label: string }) {
  const { kind, id } = drag;
  const role = drag.kind === 'prose' ? drag.role : undefined;
  // Stable while the block is the same, so a render mid-drag doesn't re-register it.
  const register = useCallback(
    (handle: HTMLSpanElement) =>
      draggableBlock(
        handle,
        kind === 'prose' ? { kind, id, role: role ?? 'alone' } : { kind, id },
        label
      ),
    [kind, id, role, label]
  );
  return (
    <span
      ref={register}
      aria-hidden
      title="Drag to move"
      className={`
        inline-flex size-8 cursor-grab items-center justify-center rounded-md
        text-text-muted/60 hover:bg-surface-hover hover:text-text-primary
        active:cursor-grabbing
      `}
    >
      <GripVerticalIcon className="size-4" />
    </span>
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
      if (store.getState().status !== 'saved') void store.settle().then(onClosed);
    };
  }, [store]);
}

/** Asks before leaving with edits not yet saved. */
function useWarnBeforeLeaving(state: DraftState) {
  const unsaved = state.status !== 'saved';
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
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
function TitleInput({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  return (
    // A one-row textarea that grows, so a long name wraps like the heading does.
    // Enter saves (a name is one line); Escape reverts.
    <textarea
      key={name}
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
    <Menu.Root>
      <Menu.Trigger
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
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="z-50 outline-none">
          <Menu.Popup className={MENU_POPUP}>{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Item({
  icon: Icon,
  onClick,
  disabled,
  children,
}: {
  icon: typeof PencilIcon;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Menu.Item className={MENU_ITEM} onClick={onClick} disabled={disabled}>
      <Icon size={16} className="shrink-0 text-text-muted" aria-hidden />
      {children}
    </Menu.Item>
  );
}

type Moves = { up: PlaylistOp | null; down: PlaylistOp | null; ownGroup: PlaylistOp | null };

/** A section's or group's own menu, on its header: move it, give it an intro, remove it. */
function BoxMenu({
  tone,
  moves,
  onEdit,
  onIntro,
  onRemove,
}: {
  tone: 'section' | 'group';
  moves: () => Pick<Moves, 'up' | 'down'>;
  onEdit: (op: PlaylistOp | null) => void;
  onIntro: () => void;
  onRemove: () => void;
}) {
  const noun = tone === 'section' ? 'Section' : 'Group';
  return (
    <EditMenu label={`Edit ${noun.toLowerCase()}`}>
      {tone === 'group' && (
        <Item icon={TextIcon} onClick={onIntro}>
          Add Section Intro
        </Item>
      )}
      <BoxMoveItems moves={moves} onEdit={onEdit} noun={noun} />
      <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />
      <Item icon={Trash2Icon} onClick={onRemove}>
        Remove {noun} and Tracks
      </Item>
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
      <Item icon={ArrowUpIcon} onClick={() => onEdit(up)} disabled={!up}>
        {noun ? `Move ${noun} Up` : 'Move Up'}
      </Item>
      <Item icon={ArrowDownIcon} onClick={() => onEdit(down)} disabled={!down}>
        {noun ? `Move ${noun} Down` : 'Move Down'}
      </Item>
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
      <Item icon={ArrowUpIcon} onClick={() => onEdit(up)} disabled={!up}>
        Move Up
      </Item>
      <Item icon={ArrowDownIcon} onClick={() => onEdit(down)} disabled={!down}>
        Move Down
      </Item>
      {ownGroup && (
        <Item icon={GroupIcon} onClick={() => onEdit(ownGroup)}>
          Move to Its Own Group
        </Item>
      )}
    </>
  );
}

function CellMenu({
  row,
  sections,
  hasNote,
  onNote,
  onIntro,
  onAddBelow,
  onEdit,
  moves,
  moveToSection,
  sectionName,
  onRemove,
}: {
  row: PlaylistTrackGroupRow;
  sections: { id: string }[];
  hasNote: boolean;
  onNote: () => void;
  onIntro: () => void;
  onAddBelow: () => void;
  onEdit: (op: PlaylistOp | null) => void;
  moves: () => Moves;
  moveToSection: (segmentId: string) => PlaylistOp;
  sectionName: (segmentId: string) => string;
  onRemove: () => void;
}) {
  return (
    <EditMenu label={`Edit ${row.kind === 'track' ? (row.trackTitle ?? 'track') : 'track'}`}>
      <Item icon={PencilIcon} onClick={onNote}>
        {hasNote ? 'Edit Note' : 'Add Note'}
      </Item>
      {!row.segment && (
        <Item icon={TextIcon} onClick={onIntro}>
          Add Section Intro
        </Item>
      )}
      <Item icon={PlusIcon} onClick={onAddBelow}>
        Add Text Below
      </Item>
      <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />
      <MoveItems moves={moves} onEdit={onEdit} />
      {sections.length > 0 && (
        <Menu.SubmenuRoot>
          <Menu.SubmenuTrigger className={MENU_ITEM}>
            <GroupIcon size={16} className="shrink-0 text-text-muted" aria-hidden />
            <span className="flex-1">Move to Section</span>
            <ChevronRightIcon size={14} className="shrink-0 text-text-muted" aria-hidden />
          </Menu.SubmenuTrigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={4} className="z-50 outline-none">
              <Menu.Popup className={MENU_POPUP}>
                {sections.map((s) => (
                  <Menu.Item
                    key={s.id}
                    className={MENU_ITEM}
                    onClick={() => onEdit(moveToSection(s.id))}
                  >
                    <span className="truncate">{sectionName(s.id)}</span>
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.SubmenuRoot>
      )}
      <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />
      <Item icon={Trash2Icon} onClick={onRemove}>
        Remove
      </Item>
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
        flex w-full items-center gap-2 rounded-[inherit] py-2 pl-[52px] text-sm text-text-muted
        transition-colors hover:bg-text-primary/[0.03] hover:text-text-primary
        focus-visible:outline-2 focus-visible:outline-accent
      "
    >
      <PlusIcon className="-ml-6 size-4" aria-hidden />
      Add Text
    </button>
  );
}
