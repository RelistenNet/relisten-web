import { Suspense } from 'react';
import { getCurrentUser, getLibrarySnapshot, signInHref } from '@/lib/session/server';
import SessionForms from '@/components/SessionForms';

export const metadata = { title: 'Account' };

// Streams in after the shell: the library call must not hold the flush point.
async function FavoritesCount() {
  const library = await getLibrarySnapshot();
  return library ? <> · {library.favorites.length} favorites</> : ' · favorites unavailable';
}

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

  return (
    <div className="content">
      <h1>Account</h1>
      <p>
        Signed in as <strong>{user.username}</strong>
        <Suspense fallback={null}>
          <FavoritesCount />
        </Suspense>
      </p>
      <SessionForms />
    </div>
  );
}
