'use client';

import { XIcon } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import type { DeploymentEnvironment } from '@/lib/deployment/environment';

type Preview = Extract<DeploymentEnvironment, { kind: 'preview' }>;

const WARNING = 'Uses your real account. Changes to favorites and your library are shared.';

// Dismissed for the browser session, per commit, so a new deploy shows it again.
const listeners = new Set<() => void>();
const storageKey = (id: string) => `preview-dismissed:${id}`;
function isDismissed(id: string): boolean {
  try {
    return sessionStorage.getItem(storageKey(id)) === '1';
  } catch {
    return false; // Storage blocked: the pill stays.
  }
}
function dismiss(id: string): void {
  try {
    sessionStorage.setItem(storageKey(id), '1');
  } catch {
    // Storage blocked: nothing to remember it in.
  }
  for (const l of listeners) l();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * A preview or staging deployment's badge: a pill floating bottom right, over
 * the page (it takes no space).
 */
export default function PreviewIndicator({ deployment }: { deployment: DeploymentEnvironment }) {
  if (deployment.kind === 'preview') return <PreviewPill deployment={deployment} />;
  if (deployment.kind === 'staging') return <StagingPill />;
  return null;
}

function useDismissed(id: string) {
  return useSyncExternalStore(
    subscribe,
    () => isDismissed(id),
    () => false
  );
}

function StagingPill() {
  if (useDismissed('staging')) return null;
  return (
    <Pill label="Staging deployment" title={WARNING} onDismiss={() => dismiss('staging')}>
      <span className="shrink-0 font-semibold">Soundcheck</span>
      <span className="truncate text-text-muted">Uses your real account</span>
    </Pill>
  );
}

function PreviewPill({ deployment }: { deployment: Preview }) {
  const sha = deployment.headSha;
  if (useDismissed(sha)) return null;
  return (
    <Pill
      label="Preview deployment"
      title={`${deployment.branch}\n${WARNING}`}
      onDismiss={() => dismiss(sha)}
    >
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
    </Pill>
  );
}

function Pill({
  label,
  title,
  onDismiss,
  children,
}: {
  label: string;
  title: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label={label}
      title={title}
      className="
        fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 flex
        max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-hairline
        bg-surface-raised py-1 pr-1 pl-3 text-xs text-text-primary shadow-lg
      "
    >
      <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      {children}
      <button
        type="button"
        aria-label="Dismiss badge"
        onClick={onDismiss}
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
