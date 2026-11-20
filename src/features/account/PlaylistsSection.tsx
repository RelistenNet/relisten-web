import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import type { FollowedPlaylistHeadWire, PlaylistSummaryWire } from '@/domain/playlists';
import type { PlaylistLibrary } from '@/data/playlists';
import { numberFormat } from '@/lib/utils';
import Tag from '@/ui/base/Tag';

// The account page's playlists: the listener's own (archived ones folded away)
// and the ones they follow. Read-only for now; playlists are made in the app.

const tracks = (n: number) => `${numberFormat.format(n)} ${n === 1 ? 'track' : 'tracks'}`;

const LIST = 'flex flex-col divide-y divide-hairline rounded-lg border border-hairline';
const ROW = 'flex items-center justify-between gap-3 px-3 py-2.5';

/** `library` is null when the User Service couldn't be read: the rest of the page still renders. */
export default function PlaylistsSection({ library }: { library: PlaylistLibrary | null }) {
  if (!library) {
    return (
      <section>
        <h2>Playlists</h2>
        <p className="text-text-muted">Your playlists couldn&rsquo;t be loaded. Try again later.</p>
      </section>
    );
  }

  const active = library.owned.filter((p) => !p.archived);
  const archived = library.owned.filter((p) => p.archived);

  return (
    <>
      <section>
        <h2>Playlists</h2>
        {active.length === 0 ? (
          <p className="text-text-muted">
            You haven&rsquo;t made any playlists yet. Make one in the Relisten app.
          </p>
        ) : (
          <ul className={LIST}>
            {active.map((p) => (
              <OwnedRow key={p.playlist_id} playlist={p} />
            ))}
          </ul>
        )}
        {archived.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-text-muted">
              Archived ({numberFormat.format(archived.length)})
            </summary>
            <ul className={`${LIST} mt-2`}>
              {archived.map((p) => (
                <OwnedRow key={p.playlist_id} playlist={p} />
              ))}
            </ul>
          </details>
        )}
      </section>

      {library.followed.length > 0 && (
        <section>
          <h2>Following</h2>
          <ul className={LIST}>
            {library.followed.map((p) => (
              <FollowedRow key={p.playlist_id} playlist={p} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function OwnedRow({ playlist: p }: { playlist: PlaylistSummaryWire }) {
  return (
    <li className={ROW}>
      <Link
        href={href('/account/playlists/[playlistId]', { playlistId: p.playlist_id })}
        className="min-w-0 truncate font-medium hover:text-accent"
      >
        {p.name}
      </Link>
      <span className="flex shrink-0 items-center gap-1 text-sm text-text-muted">
        {p.taken_down ? (
          <Tag variant="error">TAKEN DOWN</Tag>
        ) : (
          p.published && <Tag variant="info">PUBLISHED</Tag>
        )}
        <span className="ml-1">{tracks(p.track_count ?? p.entry_count)}</span>
      </span>
    </li>
  );
}

/** An unavailable one (unpublished, archived, taken down) carries no name: say so, with no link. */
function FollowedRow({ playlist: p }: { playlist: FollowedPlaylistHeadWire }) {
  if (!p.available || !p.public_code) {
    return (
      <li className={`${ROW} text-text-muted italic`}>This playlist is no longer available</li>
    );
  }
  return (
    <li className={ROW}>
      <Link
        href={href('/playlists/[publicCode]', { publicCode: p.public_code })}
        className="min-w-0 truncate font-medium hover:text-accent"
      >
        {p.name}
      </Link>
      {p.owner && <span className="shrink-0 text-sm text-text-muted">by {p.owner.username}</span>}
    </li>
  );
}
