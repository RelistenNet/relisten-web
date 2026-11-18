import { href } from '@timber-js/app/routes';
import { getCurrentUser } from '@/data/session';
import { signInHref } from '@/lib/searchParams/sessionSearchParams';
import SessionForms from './SessionForms';

/** Signed-out: a plain sign-in link (no client JS). Signed-in: the username and the sign-out / switch-account forms. */
export default async function AccountPage() {
  const user = await getCurrentUser();

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
    </div>
  );
}
