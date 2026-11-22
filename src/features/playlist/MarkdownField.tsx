'use client';

import { BoldIcon, ClockIcon, ItalicIcon, LinkIcon } from 'lucide-react';
import {
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react';
import { z } from 'zod/v4';
import cn from '@/lib/cn';
import { type FieldState, record, redo, startHistory, undo } from './fieldHistory';
import { readPlayback, useQueue } from '@/player/hooks';
import {
  characterCount,
  formatTimestamp,
  insertLink,
  insertTimestamp,
  parseTimestamp,
  pasteAsLink,
  type TextEdit,
  toggleWrap,
} from './markdownEdits';

// Prose as written, in a textarea in the prose's own type (docs/playlist-editing.md:
// no rich-text editor; the stored text is exactly what the author typed). Shortcuts
// and the toolbar change the text with setRangeText, and the field keeps its own
// undo history (fieldHistory.ts) so ⌘Z steps back through typing and edits alike.
// Done when focus leaves the field (the toolbar and timestamp row are inside it),
// or ⌘/Ctrl+Enter; Escape cancels.

/**
 * Something the field's block can do besides being edited (it has no menu of its
 * own): it closes the field first, saving the text, or discarding it.
 */
export type FieldAction = {
  label: string;
  icon: typeof BoldIcon;
  run: () => void;
  disabled?: boolean;
  /** Close without saving the text (a removal). */
  discard?: boolean;
};

/** A track a timestamp can point into. */
export type TimestampTarget = { entryId: string; title: string; duration?: number };

const selection = (t: HTMLTextAreaElement) => ({ start: t.selectionStart, end: t.selectionEnd });

const TimestampForm = z.object({
  entryId: z.string().min(1),
  time: z.string().transform((t, ctx) => {
    const seconds = parseTimestamp(t);
    if (seconds === null) {
      ctx.addIssue({ code: 'custom', message: 'Use m:ss or h:mm:ss.' });
      return z.NEVER;
    }
    return seconds;
  }),
});

export default function MarkdownField({
  label,
  initial,
  limit,
  error,
  timestampTargets = [],
  ownEntryId,
  actions = [],
  onDone,
  onInterrupted,
  handOverRef,
}: {
  label: string;
  initial: string;
  /** The server's limit, in characters. */
  limit: number;
  /** Why the server refused this text last time (it reopens with it). */
  error?: string;
  /** The playlist's playable tracks, for Insert Timestamp. */
  timestampTargets?: TimestampTarget[];
  /** A track note's own entry: its timestamps link as `#t=`. */
  ownEntryId?: string;
  /** The block's moves and removal, in the toolbar. */
  actions?: FieldAction[];
  /** Finished: the text, or null when cancelled (Escape). */
  onDone: (text: string | null) => void;
  /**
   * Closed without finishing (its block went away, or the page did): the text
   * as it stood, so it isn't lost.
   */
  onInterrupted: (text: string) => void;
  /**
   * Set (while the field is open) to hand its text over now, as if interrupted:
   * the editor calls it when it closes, before checking what's left to save, so
   * the order the two unmount in doesn't matter. Doing it twice does nothing more.
   */
  handOverRef?: RefObject<(() => void) | null>;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const cancelled = useRef(false);
  const finished = useRef(false);
  const interrupted = useEffectEvent(onInterrupted);
  // Only events read and write it, never rendering: a ref.
  const history = useRef(
    startHistory({ value: initial, start: initial.length, end: initial.length })
  );
  const [count, setCount] = useState(() => characterCount(initial));
  const [stamping, setStamping] = useState(false);

  const snapshot = (t: HTMLTextAreaElement): FieldState => ({
    value: t.value,
    start: t.selectionStart,
    end: t.selectionEnd,
  });
  const show = (t: HTMLTextAreaElement, state: FieldState) => {
    t.value = state.value;
    t.setSelectionRange(state.start, state.end);
    setCount(characterCount(state.value));
  };
  const step = (direction: 'undo' | 'redo') => {
    const t = textarea.current;
    if (!t) return;
    history.current = (direction === 'undo' ? undo : redo)(history.current);
    show(t, history.current.present);
  };

  /** Applies an edit as its own undo step. */
  const run = (make: (value: string, sel: { start: number; end: number }) => TextEdit | null) => {
    const t = textarea.current;
    if (!t) return false;
    const edit = make(t.value, selection(t));
    if (!edit) return false;
    t.focus();
    t.setRangeText(edit.text, edit.range.start, edit.range.end);
    t.setSelectionRange(edit.select.start, edit.select.end);
    history.current = record(history.current, snapshot(t), { typed: false, now: Date.now() });
    setCount(characterCount(t.value));
    return true;
  };

  // The browser's own undo (the Edit menu, a shake on iOS) arrives as beforeinput;
  // answer it from the field's history instead. React doesn't expose inputType.
  const browserUndo = (t: HTMLTextAreaElement | null) => {
    if (!t) return;
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType !== 'historyUndo' && e.inputType !== 'historyRedo') return;
      e.preventDefault();
      step(e.inputType === 'historyUndo' ? 'undo' : 'redo');
    };
    t.addEventListener('beforeinput', onBeforeInput);
    return () => t.removeEventListener('beforeinput', onBeforeInput);
  };

  const keys = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelled.current = true;
      e.currentTarget.blur();
    } else if (mod && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (mod && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) {
      e.preventDefault();
      step(e.key === 'y' || e.shiftKey ? 'redo' : 'undo');
    } else if (mod && (e.key === 'b' || e.key === 'i' || e.key === 'k')) {
      e.preventDefault();
      run((v, s) =>
        e.key === 'k' ? insertLink(v, s) : toggleWrap(v, s, e.key === 'b' ? '**' : '*')
      );
    }
  };

  const paste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (run((v, s) => pasteAsLink(v, s, pasted))) e.preventDefault();
  };

  // Done when focus leaves the field entirely, not when it moves to its own toolbar.
  const leave = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    finished.current = true;
    onDone(cancelled.current ? null : (textarea.current?.value ?? ''));
  };

  // Unmounted unfinished (its block went, or the page): hand the text back, once,
  // whether this field or the editor around it gets there first.
  useEffect(() => {
    const give = () => {
      if (finished.current) return;
      finished.current = true;
      interrupted(history.current.present.value);
    };
    if (handOverRef) handOverRef.current = give;
    return () => {
      give();
      if (handOverRef?.current === give) handOverRef.current = null;
    };
  }, [handOverRef]);

  const near = count > limit * 0.8;
  return (
    // The textarea sits exactly where the text did (its padding offset by the
    // margins), and the toolbar floats under it, so opening a block moves nothing.
    // (A measure set on the text, like a comment's 65ch, widens by the padding too,
    // so lines wrap where they did.)
    <div onBlur={leave} className="relative -mx-2 -my-1 max-w-[calc(65ch+1rem)]!">
      <textarea
        ref={(t) => {
          textarea.current = t;
          return browserUndo(t);
        }}
        aria-label={label}
        aria-invalid={!!error || count > limit}
        defaultValue={initial}
        // Browsers without field-sizing grow by rows instead.
        rows={Math.max(2, initial.split('\n').length + 1)}
        autoFocus
        onKeyDown={keys}
        onPaste={paste}
        onInput={(e) => {
          const t = e.currentTarget;
          // Typing groups into steps; a paste or a drop is a step of its own.
          const kind = (e.nativeEvent as InputEvent).inputType ?? '';
          const typed = kind.startsWith('insertText') || kind.startsWith('delete');
          history.current = record(history.current, snapshot(t), { typed, now: e.timeStamp });
          setCount(characterCount(t.value));
        }}
        className="
          block [field-sizing:content] w-full resize-none rounded-lg bg-text-primary/[0.04] px-2
          py-1 ring-1 ring-hairline outline-none focus:ring-accent
          aria-invalid:ring-red-500/60
        "
      />
      <div
        className="
          absolute inset-x-0 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-lg
          bg-surface-raised p-1 shadow-lg ring-1 ring-hairline
        "
      >
        <div className="flex flex-wrap items-center gap-0.5 text-xs text-text-muted">
          <Tool label="Bold (⌘B)" onClick={() => run((v, s) => toggleWrap(v, s, '**'))}>
            <BoldIcon className="size-3.5" aria-hidden />
          </Tool>
          <Tool label="Italic (⌘I)" onClick={() => run((v, s) => toggleWrap(v, s, '*'))}>
            <ItalicIcon className="size-3.5" aria-hidden />
          </Tool>
          <Tool label="Link (⌘K)" onClick={() => run((v, s) => insertLink(v, s))}>
            <LinkIcon className="size-3.5" aria-hidden />
          </Tool>
          {timestampTargets.length > 0 && (
            <Tool label="Insert Timestamp" onClick={() => setStamping((s) => !s)}>
              <ClockIcon className="size-3.5" aria-hidden />
              <span className="ml-1">Timestamp</span>
            </Tool>
          )}
          {actions.length > 0 && <span aria-hidden className="mx-1 h-4 w-px bg-hairline" />}
          {actions.map((action) => (
            <Tool
              key={action.label}
              label={action.label}
              disabled={action.disabled}
              onClick={() => {
                finished.current = true;
                onDone(action.discard ? null : (textarea.current?.value ?? ''));
                action.run();
              }}
            >
              <action.icon className="size-3.5" aria-hidden />
            </Tool>
          ))}
          <span className="ml-auto pr-1 tabular-nums">
            {error ? (
              <span role="alert" className="text-red-500">
                {error}
              </span>
            ) : near ? (
              <span className={cn(count > limit && 'text-red-500')}>
                {count.toLocaleString()} / {limit.toLocaleString()}
              </span>
            ) : (
              '⌘↵ to finish · Esc to cancel'
            )}
          </span>
        </div>
        {stamping && (
          <TimestampRow
            targets={timestampTargets}
            ownEntryId={ownEntryId}
            onInsert={(target) => {
              setStamping(false);
              run((v, s) => insertTimestamp(v, s, target));
            }}
            onCancel={() => {
              setStamping(false);
              textarea.current?.focus();
            }}
          />
        )}
      </div>
    </div>
  );
}

function Tool({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      // Keep the textarea's selection: the click mustn't take focus first.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="
        inline-flex items-center rounded-md px-1.5 py-1 hover:bg-surface-hover
        hover:text-text-primary disabled:opacity-40 disabled:hover:bg-transparent
      "
    >
      {children}
    </button>
  );
}

/**
 * Picks a track and a moment. The time starts at the track's playing position
 * when it's the one playing, else 0:00.
 */
function TimestampRow({
  targets,
  ownEntryId,
  onInsert,
  onCancel,
}: {
  targets: TimestampTarget[];
  ownEntryId?: string;
  onInsert: (target: {
    entryId: string;
    seconds: number;
    own: boolean;
    fallbackLabel: string;
  }) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const currentKey = useQueue((q) => q.current?.key);
  const [entryId, setEntryId] = useState(
    ownEntryId ?? (targets.find((t) => t.entryId === currentKey) ?? targets[0]).entryId
  );
  const playingHere = entryId === currentKey;
  const [time, setTime] = useState(() =>
    formatTimestamp(playingHere ? readPlayback().currentTime : 0)
  );
  const [error, setError] = useState<string>();

  const insert = () => {
    const parsed = TimestampForm.safeParse({ entryId, time });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    const target = targets.find((t) => t.entryId === entryId);
    if (target?.duration && parsed.data.time >= target.duration)
      return setError(`${target.title} is ${formatTimestamp(target.duration)} long.`);
    onInsert({
      entryId,
      seconds: parsed.data.time,
      own: entryId === ownEntryId,
      fallbackLabel: `${target?.title ?? 'Track'} at ${formatTimestamp(parsed.data.time)}`,
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg bg-text-primary/[0.04] p-2 text-sm"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          insert();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <label htmlFor={`${id}-track`} className="sr-only">
        Track
      </label>
      <select
        id={`${id}-track`}
        value={entryId}
        onChange={(e) => {
          setEntryId(e.target.value);
          setError(undefined);
        }}
        className="min-w-0 flex-1 rounded-md bg-surface-raised px-2 py-1 ring-1 ring-hairline"
      >
        {targets.map((t) => (
          <option key={t.entryId} value={t.entryId}>
            {t.title}
            {t.entryId === ownEntryId ? ' (this track)' : ''}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-time`} className="text-text-muted">
        at
      </label>
      <input
        id={`${id}-time`}
        value={time}
        onChange={(e) => {
          setTime(e.target.value);
          setError(undefined);
        }}
        inputMode="numeric"
        placeholder="m:ss"
        aria-invalid={!!error}
        className="w-20 rounded-md bg-surface-raised px-2 py-1 tabular-nums ring-1 ring-hairline"
      />
      <button
        type="button"
        onClick={insert}
        className="rounded-md bg-accent/15 px-2.5 py-1 font-medium hover:bg-accent/25"
      >
        Insert
      </button>
      {error && (
        <span role="alert" className="w-full text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}
