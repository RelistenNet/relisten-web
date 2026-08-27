import { getCurrentUser, getLibrarySnapshot, signInHref } from '@/lib/session/server';
import { signOut, switchAccount } from '@/lib/session/actions';

export const metadata = { title: 'Account' };

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Sign in to sync your favorites across the web and the apps.</p>
        <a href={signInHref('/account')} className="underline">
          Sign in with Relisten
        </a>
      </div>
    );
  }

  const library = await getLibrarySnapshot().catch(() => null);

  return (
    <div className="content">
      <h1>Account</h1>
      <p>
        Signed in as <strong>{user.username}</strong>
        {library ? ` · ${library.favorites.length} favorites` : null}
      </p>
      <div className="flex gap-4">
        <form action={signOut}>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
        <form action={switchAccount}>
          <button type="submit" className="underline">
            Switch account
          </button>
        </form>
      </div>
    </div>
  );
}
