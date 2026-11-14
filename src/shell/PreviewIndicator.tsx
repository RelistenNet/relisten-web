import type { DeploymentEnvironment } from '@/lib/deployment/environment';

export default function PreviewIndicator({ deployment }: { deployment: DeploymentEnvironment }) {
  if (!deployment.isPreview) return null;
  return (
    <aside
      aria-label="Preview deployment"
      className="
        flex h-16 min-w-0 flex-col justify-center border-b border-hairline bg-surface-raised px-3
        text-xs text-text-primary
      "
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <a
          className="shrink-0 font-semibold underline"
          href={`https://github.com/RelistenNet/relisten-web/pull/${deployment.prNumber}`}
          target="_blank"
          rel="noreferrer"
        >
          Preview · PR #{deployment.prNumber}
        </a>
        <span className="truncate" title={deployment.branch}>
          {deployment.branch}
        </span>
        <code className="shrink-0">{deployment.headSha.slice(0, 7)}</code>
      </div>
      <p className="mt-1 mb-0">
        Uses your real account. Changes to favorites and your library are shared.
      </p>
    </aside>
  );
}
