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
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  startTransition,
  useState,
} from 'react';
import { toast } from 'sonner';
import { z } from 'zod/v4';
import { PlaylistOpError } from '@/domain/playlistOps';
import type { PlaylistContent, PlaylistOp } from '@/domain/playlists';
import cn from '@/lib/cn';
import { MENU_ITEM, MENU_POPUP } from '@/player/menuStyles';
import { TOASTER_ID } from '@/player/toasts';
import { createDraftStore, type DraftState, type DraftStore } from '@/playlists/store';
import { playlistTransport } from '@/playlists/transport';
import { useDraft } from '@/playlists/useDraft';
import type { PlaylistTrackGroupRow } from './blocks';
import {
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
import PlaylistArticle, {
  ACTION,
  type ArticleSlots,
  type GapAt,
  type ProseOwner,
} from './PlaylistArticle';
import { PLAYLIST_PROSE, type PlaylistResolved, playlistView } from './rows';
import { usePlaylistDrag } from './usePlaylistDrag';

// The editor (docs/playlist-editing.md): the read view's article, laid out from
// a draft, with menus on every cell, prose block and gap. Edits apply at once and
// save in the background (src/playlists/store.ts). Prose is edited as written, in
// a textarea; when the edits are saved the server renders the page again, so
// Markdown and timestamps show as readers will see them.

/** Reopened after the server refused it: the text as written, and why. */
type Refused = { draft?: string; error?: string };

/** An open text field the server could refuse, and so reopen. */
type TextEditing = Extract<NonNullable<Editing>, { kind: 'prose' | 'gap' }>;

type Editing =
  | ({ kind: 'prose'; owner: ProseOwner } & Refused)
  /** New text, or tracks to add, at a gap. */
  | ({ kind: 'gap'; at: GapAt } & Refused)
  /** Opening the composer after a row (or at the end): laid out, then it's a gap. */
  | { kind: 'insert'; after: string }
  | null;

const sameOwner = (a: ProseOwner, b: ProseOwner) =>
  a.kind === b.kind && (a.kind === 'playlist' || (b.kind !== 'playlist' && a.id === b.id));

/** The server's rule for a name: 1–100 characters, trimmed. */
const PlaylistName = z.string().trim().min(1, 'A playlist needs a name.').max(100);

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
  // The prose last sent: reopened with its text if the server refuses it.
  const lastProse = useRef<{ editing: TextEditing; text: string } | null>(null);
  useStoreEvents(store, {
    onSaved: () => {
      lastProse.current = null;
      // The server renders the page again only when something waits on it (prose
      // shown as written); a move or a removal needs nothing.
      if (view.pendingProse.length) router.refresh();
    },
    onRefused: (error) => {
      const last = lastProse.current;
      lastProse.current = null;
      if (last) setEditing({ ...last.editing, draft: last.text, error });
    },
  });
  useWarnBeforeLeaving(state);
  // The server's render of saved edits on its way back (router.refresh()).
  const refreshing = usePendingNavigation((to, from) => to.href === from.href);

  /** Applies an edit; an edit the server would refuse says why instead. */
  const edit = (op: PlaylistOp | null) => {
    if (!op) return;
    try {
      store.edit(op);
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
  const composerAt =
    editing?.kind === 'insert' ? editing.after : editing?.kind === 'gap' ? editing.at.key : null;
  const openField =
    editing?.kind === 'prose'
      ? `${editing.owner.kind}:${editing.owner.kind === 'playlist' ? '' : editing.owner.id}`
      : composerAt !== null
        ? `gap:${composerAt}`
        : '';
  usePlaylistDrag({
    root,
    layoutKey: content,
    fieldKey: openField,
    dragging,
    // Zones open at once (they animate in by CSS); they close as a transition, so the
    // rows slide back together (the drag is over by then).
    onDragChange: (source) =>
      source ? setDragging(source) : startTransition(() => setDragging(null)),
    onDrop: (source, target) => {
      // One drop can be two edits (text changing how it's stored): one undo step.
      const ops = dropOps(content, source, target);
      try {
        store.editMany(ops);
      } catch (err) {
        if (err instanceof PlaylistOpError) notify(err.message);
        else throw err;
      }
    },
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
  /** Sends prose once its field closes, remembering it in case it's refused. */
  const commitProse = (editing: TextEditing, text: string | null, op: PlaylistOp | null) => {
    setEditing(null);
    if (text === null || !op) return;
    lastProse.current = { editing, text };
    edit(op);
    void store.flush();
  };

  const removed = (what: string, op: PlaylistOp) => {
    edit(op);
    toast(`Removed ${what}`, {
      toasterId: TOASTER_ID,
      action: { label: 'Undo', onClick: () => store.undo() },
    });
  };
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
        />
      );
      if (sameOwner(editing.owner, owner)) return field(owner, 'Text');
      // A new intro for a loose group opens under its last track, where it will show.
      if (editing.owner.kind === 'segment' && owner.kind === 'note') {
        const segmentId = editing.owner.id;
        const segment = content.segments.find((s) => s.id === segmentId);
        if (segment && !segment.description && segment.entries.at(-1)?.id === owner.id)
          return field(editing.owner, 'Section intro');
      }
      return undefined;
    },

    editProse: (owner) => setEditing({ kind: 'prose', owner }),

    // Waiting on the server's render, unless saving it failed (the toolbar says so).
    prosePending: (owner) =>
      state.status !== 'error' &&
      view.pendingProse.includes(owner.kind === 'playlist' ? PLAYLIST_PROSE : owner.id),

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
                onAddBelow={() => setEditing({ kind: 'insert', after: row.row.id })}
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
                  firstLine(content.segments.find((s) => s.id === segmentId)?.description)
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
    },

    gap: (at) => {
      // The composer's row, or the Add zone at the end.
      const open = composerAt === at.key && editing && editing.kind !== 'prose' ? editing : null;
      const refused = open?.kind === 'gap' ? open : undefined;
      return {
        control:
          at.key === 'end' ? (
            <GapControl onAddText={() => setEditing({ kind: 'gap', at })} />
          ) : undefined,
        content: open ? (
          <MarkdownField
            label="New text"
            initial={refused?.draft ?? ''}
            error={refused?.error}
            limit={2000}
            timestampTargets={timestampTargets}
            onDone={(text) =>
              commitProse(
                { kind: 'gap', at },
                text,
                text === null ? null : insertText(content, at, text)
              )
            }
          />
        ) : undefined,
      };
    },

    toolbar: (
      <div className="flex items-center gap-2 text-sm">
        <SaveStatus state={state} refreshing={refreshing} onRetry={() => void store.flush()} />
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
        <button
          type="button"
          onClick={() => store.undo()}
          disabled={!state.canUndo}
          className={TOOL}
        >
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
              beforePublish={() => store.whenSaved()}
              playlistId={initial.playlistId}
              publicCode={publicCode}
              takenDown={takenDown}
            />
            <Link
              href={viewHref}
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

/** Shows a block can be dragged (it drags from anywhere); the menus are the keyboard's way. */
function Grip({ drag, label }: { drag: DragSource; label: string }) {
  return (
    <span
      data-drag-kind={drag.kind}
      data-drag-id={drag.id}
      data-drag-role={drag.kind === 'prose' ? drag.role : undefined}
      // What the drag image says (usePlaylistDrag).
      data-drag-label={label}
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

const firstLine = (text?: string) => (text ?? '').split('\n')[0].slice(0, 40) || 'Section';

const TOOL = `
  inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-sm
  font-medium text-text-secondary transition-colors hover:bg-surface-hover
  hover:text-text-primary disabled:opacity-40 disabled:hover:bg-transparent
`;

/**
 * Calls back when the draft's edits are all saved (the server renders the page
 * again) and when the server refuses one (422).
 */
function useStoreEvents(
  store: DraftStore,
  handlers: { onSaved: () => void; onRefused: (detail?: string) => void }
) {
  const onSaved = useEffectEvent(handlers.onSaved);
  const onRefused = useEffectEvent(handlers.onRefused);
  useEffect(() => {
    let previous = store.getState();
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.status === 'saved' && previous.status !== 'saved') onSaved();
      if (state.refused && state.refused !== previous.refused) onRefused(state.refused.detail);
      previous = state;
    });
    return () => {
      unsubscribe();
      store.dispose();
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
  if (state.refused && state.status !== 'error') {
    // Refused, though the edits after it saved: say so until the next edit.
    return (
      <span role="status" className="text-red-500">
        {state.refused.detail ?? 'That edit was refused'}
      </span>
    );
  }
  if (state.status === 'error') {
    const kind = state.error?.kind;
    const message =
      kind === 'signed-out'
        ? 'Signed out: sign in to save'
        : kind === 'invalid'
          ? (state.error?.detail ?? 'That edit was refused')
          : kind === 'archived'
            ? 'Archived playlists can’t be edited'
            : 'Couldn’t save';
    return (
      <span role="status" className="flex items-center gap-2 text-red-500">
        {message}
        {kind !== 'invalid' && kind !== 'archived' && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Retry
          </button>
        )}
      </span>
    );
  }
  return (
    <span role="status" className="text-text-muted">
      {state.status === 'saving' || refreshing ? 'Saving…' : 'Saved'}
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
        Move {noun} Up
      </Item>
      <Item icon={ArrowDownIcon} onClick={() => onEdit(down)} disabled={!down}>
        Move {noun} Down
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
              <Menu.Popup className={cn(MENU_POPUP, 'max-w-72')}>
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
