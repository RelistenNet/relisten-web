'use client';

import { usePathname } from '@timber-js/app/client';
import type { AccountSession } from '@/lib/session';
import type { LoginProvider } from '@/lib/oidcLogin';
import SignOutButton from './SignOutButton';

export default function AccountMenu({ session }: { session: AccountSession }) {
  const pathname = usePathname();

  if (!session.signedIn) {
    const loginHref = (provider: LoginProvider) =>
      `/auth/login?provider=${provider}&return_to=${encodeURIComponent(pathname)}`;

    return (
      <div className="inline-flex items-center gap-2">
        <a
          href={loginHref('google')}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Continue with Google
        </a>
        <a
          href={loginHref('apple')}
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Continue with Apple
        </a>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-text-secondary">@{session.username}</span>
      <SignOutButton />
    </div>
  );
}
