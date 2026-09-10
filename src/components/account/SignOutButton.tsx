'use client';

import { useRouter } from '@timber-js/app/client';
import { signOutAction } from '@/lib/authActions';

export default function SignOutButton() {
  const router = useRouter();

  const onSignOut = async () => {
    await signOutAction();
    // Re-renders the server tree (NavBar -> getSession()) so the header reflects the cleared
    // session cookie — there's no client-side session state to invalidate anymore.
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="text-sm text-text-secondary hover:text-text-primary cursor-pointer"
    >
      Sign out
    </button>
  );
}
