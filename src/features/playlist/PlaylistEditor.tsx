'use client';

import { Menu } from '@base-ui/react/menu';
import { Link, useRouter } from '@timber-js/app/client';
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
import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';
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
  moveToOwnGroup,
  moveToSection,
  removeText,
  saveProse,
  sourceOf,
} from './editOps';
import { dropOp } from './dragOps';
import MarkdownField from './MarkdownField';
import PlaylistArticle, { type ArticleSlots, type GapAt, type ProseOwner } from './PlaylistArticle';
import { type PlaylistResolved, playlistView } from './rows';
import { usePlaylistDrag } from './usePlaylistDrag';

// The editor (docs/playlist-editing.md): the read view's article, laid out from
// a draft, with menus on every cell, prose block and gap. Edits apply at once and
// save in the background (src/playlists/store.ts). Prose is edited as written, in
// a textarea; when the edits are saved the server renders the page again, so
// Markdown and timestamps show as readers will see them.

/** Reopened after the server refused it: the text as written, and why. */
type Refused = { draft?: string; error?: string };

type Editing =
  | ({ kind: 'prose'; owner: ProseOwner } & Refused)
  /** New text at a gap. */
  | ({ kind: 'gap'; at: GapAt } & Refused)
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
  byline,
}: {
  initial: PlaylistContent;
  resolved: PlaylistResolved;
  /** The playlist's page: Done goes back there. */
  viewHref: string;
  byline: ReactNode[];
}) {
  const router = useRouter();
  // One draft per playlist for as long as the page is open; the route keys this by id.
  const [store] = useState(() => createDraftStore(initial, { transport: playlistTransport }));
  const state = useDraft(store);
  const [editing, setEditing] = useState<Editing>(null);
  // The prose last sent: reopened with its text if the server refuses it.
  const lastProse = useRef<{ editing: NonNullable<Editing>; text: string } | null>(null);
  useStoreEvents(store, {
    onSaved: () => {
      lastProse.current = null;
      router.refresh();
    },
    onRefused: (error) => {
      const last = lastProse.current;
      lastProse.current = null;
      if (last) setEditing({ ...last.editing, draft: last.text, error });
    },
  });
  useWarnBeforeLeaving(state);

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
  const dropLine = useRef<HTMLDivElement>(null);
  const openField =
    editing?.kind === 'prose'
      ? `${editing.owner.kind}:${editing.owner.kind === 'playlist' ? '' : editing.owner.id}`
      : editing?.kind === 'gap'
        ? `gap:${editing.at.index}`
        : '';
  usePlaylistDrag(root, dropLine, content, openField, (source, target) =>
    edit(dropOp(content, source, target))
  );
  const view = playlistView(content, resolved);
  const timestampTargets = view.rows.flatMap((r) =>
    r.kind === 'track'
      ? [{ entryId: r.id, title: r.trackTitle ?? 'Track', duration: r.songDuration ?? undefined }]
      : []
  );
  /** Sends prose once its field closes, remembering it in case it's refused. */
  const commitProse = (
    editing: NonNullable<Editing>,
    text: string | null,
    op: PlaylistOp | null
  ) => {
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

    proseMenu: (owner) => (
      <div className="-mt-1 -mr-1 flex items-center">
        {(owner.kind === 'segment' || owner.kind === 'text') && (
          <Grip
            // A section, or prose alone, moves as its segment; a text entry as itself.
            kind={
              owner.kind === 'segment' || content.segments.some((s) => s.id === owner.id)
                ? 'segment'
                : 'entry'
            }
            id={owner.id}
          />
        )}
        <EditMenu label="Edit text">
          <Item icon={PencilIcon} onClick={() => setEditing({ kind: 'prose', owner })}>
            Edit
          </Item>
          {owner.kind === 'segment' ? (
            <>
              <Item icon={GroupIcon} onClick={() => edit(saveProse(content, owner, ''))}>
                Dissolve Section
              </Item>
              <Item
                icon={Trash2Icon}
                onClick={() =>
                  removed('the section', {
                    operation_type: 'delete_segment',
                    payload: { segment_id: owner.id },
                  })
                }
              >
                Remove Section and Tracks
              </Item>
            </>
          ) : owner.kind === 'text' ? (
            <Item
              icon={Trash2Icon}
              onClick={() => removed('the text', removeText(content, owner.id))}
            >
              Remove
            </Item>
          ) : (
            <Item
              icon={Trash2Icon}
              onClick={() => {
                const op = saveProse(content, owner, '');
                if (op) removed(owner.kind === 'note' ? 'the note' : 'the description', op);
              }}
            >
              Remove
            </Item>
          )}
        </EditMenu>
      </div>
    ),

    cellMenu: (row) => (
      <>
        <Grip kind="entry" id={row.id} />
        <CellMenu
          row={row}
          sections={sections.filter((s) => s.id !== row.segmentId)}
          hasNote={!!row.description}
          onNote={() => setEditing({ kind: 'prose', owner: { kind: 'note', id: row.id } })}
          onIntro={() =>
            setEditing({ kind: 'prose', owner: { kind: 'segment', id: row.segmentId } })
          }
          onEdit={(op) => edit(op)}
          moveUp={moveEntry(content, row.id, -1)}
          moveDown={moveEntry(content, row.id, 1)}
          ownGroup={moveToOwnGroup(content, row.id)}
          onRemove={() =>
            removed('the track', { operation_type: 'delete_entry', payload: { entry_id: row.id } })
          }
          moveToSection={(segmentId) => moveToSection(row.id, segmentId)}
          sectionName={(segmentId) =>
            firstLine(content.segments.find((s) => s.id === segmentId)?.description)
          }
        />
      </>
    ),

    gap: (at) => ({
      control: <GapControl label="Add here" onAddText={() => setEditing({ kind: 'gap', at })} />,
      content:
        editing?.kind === 'gap' && editing.at.index === at.index ? (
          <div className="pl-[53px]">
            <MarkdownField
              label="New text"
              initial={editing.draft ?? ''}
              error={editing.error}
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
          </div>
        ) : undefined,
    }),

    toolbar: (
      <div className="flex items-center gap-2 text-sm">
        <SaveStatus state={state} onRetry={() => void store.flush()} />
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
        <Link
          href={viewHref}
          className={cn(TOOL, 'bg-accent/15 text-text-primary hover:bg-accent/25')}
        >
          Done
        </Link>
      </div>
    ),
  };

  return (
    // What's being dragged fades where it was.
    <div ref={root} className="[&_[data-dragging]]:opacity-40">
      <PlaylistArticle view={view} byline={byline} slots={slots} />
      {/* The drop line: placed by usePlaylistDrag while dragging, hidden otherwise. */}
      <div
        ref={dropLine}
        hidden
        aria-hidden
        className="pointer-events-none fixed z-50 h-0.5 rounded-full bg-accent"
      />
    </div>
  );
}

/** Drag to move; the menus move things too (and are the keyboard's way). */
function Grip({ kind, id }: { kind: 'entry' | 'segment'; id: string }) {
  return (
    <span
      data-drag-kind={kind}
      data-drag-id={id}
      aria-hidden
      title="Drag to move"
      className={`
        inline-flex size-8 cursor-grab items-center justify-center rounded-md text-text-muted
        opacity-0 transition-opacity group-focus-within/cell:opacity-100
        group-focus-within/prose:opacity-100 group-hover/cell:opacity-100
        group-hover/prose:opacity-100 hover:bg-surface-hover hover:text-text-primary
        active:cursor-grabbing pointer-coarse:opacity-100
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
      if (state.error?.kind === 'invalid' && state.error !== previous.error)
        onRefused(state.error.detail);
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

function SaveStatus({ state, onRetry }: { state: DraftState; onRetry: () => void }) {
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
      {state.status === 'saving' ? 'Saving…' : 'Saved'}
    </span>
  );
}

/** The title, as an input that looks like it. Saves on Enter or blur; Escape reverts. */
function TitleInput({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  return (
    <input
      key={name}
      defaultValue={name}
      aria-label="Playlist name"
      maxLength={100}
      onBlur={(e) => onSave(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.currentTarget.value = name;
          e.currentTarget.blur();
        }
      }}
      className="
        -mx-1 w-full rounded-md bg-transparent px-1 outline-none hover:bg-text-primary/[0.04]
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
            transition-opacity group-focus-within/cell:opacity-100
            group-focus-within/prose:opacity-100
            group-hover/cell:opacity-100 group-hover/prose:opacity-100
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

function CellMenu({
  row,
  sections,
  hasNote,
  onNote,
  onIntro,
  onEdit,
  moveUp,
  moveDown,
  ownGroup,
  moveToSection,
  sectionName,
  onRemove,
}: {
  row: PlaylistTrackGroupRow;
  sections: { id: string }[];
  hasNote: boolean;
  onNote: () => void;
  onIntro: () => void;
  onEdit: (op: PlaylistOp | null) => void;
  moveUp: PlaylistOp | null;
  moveDown: PlaylistOp | null;
  ownGroup: PlaylistOp | null;
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
      <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />
      <Item icon={ArrowUpIcon} onClick={() => onEdit(moveUp)} disabled={!moveUp}>
        Move Up
      </Item>
      <Item icon={ArrowDownIcon} onClick={() => onEdit(moveDown)} disabled={!moveDown}>
        Move Down
      </Item>
      {ownGroup && (
        <Item icon={GroupIcon} onClick={() => onEdit(ownGroup)}>
          Move to Its Own Group
        </Item>
      )}
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

/** A + on the rail, in the gap between blocks. */
function GapControl({ label, onAddText }: { label: string; onAddText: () => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        className="
          absolute top-1/2 -left-[22px] flex size-5 -translate-y-1/2 items-center justify-center
          rounded-full border border-hairline bg-surface-raised text-text-muted
          transition-colors hover:border-accent hover:text-accent
          data-popup-open:border-accent data-popup-open:text-accent
        "
      >
        <PlusIcon className="size-3" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={4} className="z-50 outline-none">
          <Menu.Popup className={MENU_POPUP}>
            <Item icon={TextIcon} onClick={onAddText}>
              Add Text
            </Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
