import { Link } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { publicPlaylistsSearchParams } from '@/lib/searchParams/publicPlaylistsSearchParams';

const TABS = [
  { scope: 'all', label: 'All Playlists' },
  { scope: 'mine', label: 'My Playlists' },
] as const;

/** Every published playlist, or the signed-in listener's own: the listing's two views. */
export default function PlaylistScopeTabs({ scope }: { scope: 'all' | 'mine' }) {
  return (
    <nav
      aria-label="Whose playlists"
      className="inline-grid auto-cols-fr grid-flow-col rounded-md border border-hairline bg-surface-recessed p-0.5"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.scope}
          href={publicPlaylistsSearchParams.href('/playlists', { scope: tab.scope })}
          aria-current={tab.scope === scope ? 'page' : undefined}
          className={cn(
            'rounded-sm px-3 py-1.5 text-center text-sm whitespace-nowrap transition-colors',
            tab.scope === scope
              ? 'bg-surface-raised font-medium text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
