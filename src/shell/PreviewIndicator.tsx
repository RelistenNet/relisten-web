'use client';

import { XIcon } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import type { DeploymentEnvironment } from '@/lib/deployment/environment';

type Preview = Extract<DeploymentEnvironment, { isPreview: true }>;

const WARNING = 'Uses your real account. Changes to favorites and your library are shared.';

// Dismissed for the browser session, per commit, so a new deploy shows it again.
const listeners = new Set<() => void>();
const storageKey = (sha: string) => `preview-dismissed:${sha}`;
function isDismissed(sha: string): boolean {
  try {
    return sessionStorage.getItem(storageKey(sha)) === '1';
  } catch {
    return false; // Storage blocked: the pill stays.
  }
}
function dismiss(sha: string): void {
  try {
    sessionStorage.setItem(storageKey(sha), '1');
  } catch {
    // Storage blocked: nothing to remember it in.
  }
  for (const l of listeners) l();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** A preview deployment's badge: a pill floating bottom right, over the page (it takes no space). */
export default function PreviewIndicator({ deployment }: { deployment: DeploymentEnvironment }) {
  if (!deployment.isPreview) return null;
  return <PreviewPill deployment={deployment} />;
}

function PreviewPill({ deployment }: { deployment: Preview }) {
  const sha = deployment.headSha;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => isDismissed(sha),
    () => false
  );
  if (dismissed) return null;
  return (
    <aside
      aria-label="Preview deployment"
      title={`${deployment.branch}\n${WARNING}`}
      className="
        fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 flex
        max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-hairline
        bg-surface-raised py-1 pr-1 pl-3 text-xs text-text-primary shadow-lg
      "
    >
      <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      <a
        className="shrink-0 font-semibold hover:underline"
        href={`https://github.com/RelistenNet/relisten-web/pull/${deployment.prNumber}`}
        target="_blank"
        rel="noreferrer"
      >
        Preview · PR #{deployment.prNumber}
      </a>
      <span className="truncate text-text-muted">{deployment.branch}</span>
      <code className="shrink-0 text-text-muted">{sha.slice(0, 7)}</code>
      <span className="sr-only">{WARNING}</span>
      <button
        type="button"
        aria-label="Dismiss preview badge"
        onClick={() => dismiss(sha)}
        className="
          inline-flex shrink-0 rounded-full p-1 text-text-muted hover:bg-surface-hover
          hover:text-text-primary
        "
      >
        <XIcon className="size-3.5" aria-hidden />
      </button>
    </aside>
  );
}
