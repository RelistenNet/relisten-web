import { Suspense } from 'react';
import { href } from '@timber-js/app/routes';
import { getCurrentUser, getLibrarySnapshot } from '@/data/session';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import SessionForms from './SessionForms';

// Streams in after the shell: the library call must not hold the flush point.
async function FavoritesCount() {
  const library = await getLibrarySnapshot();
  return library ? <> · {library.favorites.length} favorites</> : <> · favorites unavailable</>;
}

/** Signed-out: a plain sign-in link (no client JS). Signed-in: the username and the sign-out / switch-account forms. */
export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Sign in to sync your favorites across the web and the apps.</p>
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
        <FavoritesCount />
      </p>
      <SessionForms />
    </div>
  );
}
