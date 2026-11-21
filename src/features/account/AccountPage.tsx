import { href } from '@timber-js/app/routes';
import { getPlaylistLibrary, type PlaylistLibrary } from '@/data/playlists';
import { getCurrentUser } from '@/data/session';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import PlaylistsSection from './PlaylistsSection';
import SessionForms from './SessionForms';

/** Null on an outage: the playlists say so, and the rest of the page still renders. */
const loadLibrary = (): Promise<PlaylistLibrary | null> =>
  getPlaylistLibrary().catch((err) => {
    console.error('[account] playlist library failed', err);
    return null;
  });

/**
 * Signed-out: a plain sign-in link (no client JS). Signed-in: the username, the
 * sign-out / switch-account forms, and the listener's playlists.
 */
export default async function AccountPage() {
  // Both read the session cookie: fetched together, not one after the other.
  const [user, library] = await Promise.all([getCurrentUser(), loadLibrary()]);

  if (!user) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Sign in with your Relisten account.</p>
        <a href={signInHref(href('/account'))} className="underline">
          Sign in with Relisten
        </a>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>Account</h1>
      <p>
        Signed in as <strong>{user.username}</strong>
      </p>
      <SessionForms />
      <PlaylistsSection library={library} />
    </div>
  );
}
