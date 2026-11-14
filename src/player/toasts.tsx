import { toast } from 'sonner';

// The player's toasts. gapless calls back synchronously from inside player
// calls, which can run during React work (a component's effect), so toast
// updates are deferred: sonner's Toaster can't be setState'd mid-render.

const defer = (fn: () => void) => queueMicrotask(fn);

let autoplayToastVisible = false;
let failureToastVisible = false;

/**
 * A track couldn't play (or is stuck loading), with a best guess at why.
 * One at a time: a newer failure replaces the toast.
 */
export function showPlaybackFailure({
  title,
  description,
  stalled = false,
  skip,
}: {
  title: string;
  description: string;
  /** Still trying (slow), rather than failed. */
  stalled?: boolean;
  /** Skip to the next entry, if there is one. */
  skip?: () => void;
}): void {
  failureToastVisible = true;
  const show = stalled ? toast.warning : toast.error;
  defer(() =>
    show(stalled ? `"${title}" is taking a while to load` : `Can't play "${title}"`, {
      toasterId: 'audio-error',
      id: 'playback-failure',
      description,
      duration: Infinity,
      ...(skip
        ? {
            action: {
              label: 'Skip',
              onClick: () => {
                skip();
                dismissPlaybackFailure();
              },
            },
          }
        : {}),
      onDismiss: () => {
        failureToastVisible = false;
      },
    })
  );
}

export function dismissPlaybackFailure(): void {
  if (!failureToastVisible) return;
  failureToastVisible = false;
  defer(() => toast.dismiss('playback-failure'));
}

export function dismissAutoplayToast(): void {
  if (!autoplayToastVisible) return;
  autoplayToastVisible = false;
  defer(() => toast.dismiss('autoplay-blocked'));
}

/**
 * Prompts the visitor to start playback. `blockedByBrowser` adds advice for
 * sites whose sound permission is blocked; it doesn't apply when we held
 * playback back ourselves (no interaction yet; see canAutoplay).
 */
export function showPlayPrompt({
  blockedByBrowser,
  playNow,
}: {
  blockedByBrowser: boolean;
  playNow: () => void;
}): void {
  // In embeds/iframes the toast covers most of the player and its "lock icon"
  // advice refers to the host page's address bar. Just stay paused — the
  // play button is right there.
  if (window.location.pathname.startsWith('/embed') || window.self !== window.top) return;

  autoplayToastVisible = true;
  defer(() =>
    toast.warning(blockedByBrowser ? 'Autoplay blocked' : 'Ready to play', {
      toasterId: 'audio-error',
      id: 'autoplay-blocked',
      duration: Infinity,
      description: (
        <ol className="m-0 flex flex-col gap-1 pl-0">
          <li>
            To start playing, hit <strong>Play now</strong>
          </li>
          {blockedByBrowser && (
            <li>
              To prevent this in the future, click the <strong>lock icon</strong> in your address
              bar, select <strong>Sound</strong>, and choose <strong>Always Allow</strong>
            </li>
          )}
        </ol>
      ),
      classNames: {
        toast: '!bg-amber-100 !text-amber-800 !border-amber-500',
        title: '!text-base !font-semibold !inline !align-middle',
        icon: '!inline !align-middle !mr-1',
        actionButton: '!bg-amber-700 !text-white',
        closeButton: '!border-amber-400',
      },
      action: {
        label: 'Play now',
        onClick: () => {
          playNow();
          dismissAutoplayToast();
        },
      },
      onDismiss: () => {
        autoplayToastVisible = false;
      },
    })
  );
}
