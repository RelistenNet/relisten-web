import { getPlaylistDebugData } from '@/data/playlists';

// Development only (AccountPage leaves it out of production builds): the raw
// User Service responses behind the playlists section, as collapsible JSON.

const PRE = 'mt-2 max-h-[32rem] overflow-auto rounded bg-text-primary/5 p-3 text-xs';

export default async function PlaylistDebug() {
  const data = await getPlaylistDebugData().catch((err: unknown) => ({ error: String(err) }));
  return (
    <section className="mt-8 border-t border-dashed border-hairline pt-4">
      <h2 className="text-sm text-text-muted">Debug: playlist data (development only)</h2>
      {!data ? (
        <p className="text-sm text-text-muted">Signed out.</p>
      ) : 'error' in data ? (
        <pre className={PRE}>{data.error}</pre>
      ) : (
        <div className="flex flex-col gap-2">
          <details>
            <summary className="cursor-pointer text-sm">GET /v1/library/snapshot</summary>
            <pre className={PRE}>{JSON.stringify(data.library, null, 2)}</pre>
          </details>
          {data.playlists.map((p) => (
            <details key={p.id}>
              <summary className="cursor-pointer text-sm">
                GET /v1/playlists/{p.id}/snapshot
              </summary>
              <pre className={PRE}>{JSON.stringify(p.snapshot, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
