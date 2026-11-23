import { href } from '@timber-js/app/routes';
import { getPlaylistLibrary, type PlaylistLibrary } from '@/data/playlists';
import { getCurrentUser } from '@/data/session';
import { accountSearchParams, signInHref } from '@/lib/searchParams/sessionSearchParams';
import PlaylistsSection from './PlaylistsSection';
import SessionForms from './SessionForms';

/** Null on an outage: the playlists say so, and the rest of the page still renders. */
const loadLibrary = (): Promise<PlaylistLibrary | null> =>
  getPlaylistLibrary().catch((err) => {
    console.error('[account] playlist library failed', err);
    return null;
  });

/**
 * Signed-out: Relisten's sign-in page, a plain link (no client JS) that comes back
 * to `return_to` (a page that sent the visitor here) or here. Signed-in: the
 * username, the sign-out / switch-account forms, and the listener's playlists.
 */
export default async function AccountPage() {
  // Both read the session cookie: fetched together, not one after the other.
  const [user, library] = await Promise.all([getCurrentUser(), loadLibrary()]);

  if (!user) {
    const { return_to: returnTo } = accountSearchParams.get();
    return (
      <div className="content">
        <h1>Account</h1>
        <p>
          {returnTo
            ? 'Sign in with your Relisten account to see that page.'
            : 'Sign in with your Relisten account.'}
        </p>
        <a href={signInHref(returnTo ?? href('/account'))} className="underline">
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
