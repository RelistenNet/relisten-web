import { toast } from 'sonner';

// The player's toasts. gapless calls back synchronously from inside player
// calls, which can run during React work (a component's effect), so toast
// updates are deferred: sonner's Toaster can't be setState'd mid-render.

const defer = (fn: () => void) => queueMicrotask(fn);

let autoplayToastVisible = false;

export function showAudioError(): void {
  defer(() =>
    toast.error('There was an error loading your audio', {
      toasterId: 'audio-error',
      duration: Infinity,
    })
  );
}

export function dismissAutoplayToast(): void {
  if (!autoplayToastVisible) return;
  autoplayToastVisible = false;
  defer(() => toast.dismiss('autoplay-blocked'));
}

export function showAutoplayBlocked(playNow: () => void): void {
  autoplayToastVisible = true;
  defer(() =>
    toast.warning('Autoplay blocked', {
      toasterId: 'audio-error',
      id: 'autoplay-blocked',
      duration: Infinity,
      description: (
        <ol className="m-0 flex flex-col gap-1 pl-0">
          <li>
            To start playing, hit <strong>Play now</strong>
          </li>
          <li>
            To prevent this in the future, click the <strong>lock icon</strong> in your address bar,
            select <strong>Sound</strong>, and choose <strong>Always Allow</strong>
          </li>
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
