'use client';

import { useActionState } from '@timber-js/app/client';
import { signOut, switchAccount } from '@/lib/session/actions';

const MESSAGES: Record<string, string> = {
  SESSION_REJECTED: 'The account service rejected the request. Reload and try again.',
  SESSION_UNAVAILABLE: 'The account service is temporarily unavailable.',
};

function SessionButton({ action, label }: { action: typeof signOut; label: string }) {
  const [, formAction, pending, errors] = useActionState(action, null);
  const error = errors.serverError?.code;
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="underline disabled:opacity-50">
        {pending ? `${label}…` : label}
      </button>
      {error && (
        <p className="mt-1 text-sm text-red-500">{MESSAGES[error] ?? 'Something went wrong.'}</p>
      )}
    </form>
  );
}

export default function SessionForms() {
  return (
    <div className="flex gap-4">
      <SessionButton action={signOut} label="Sign out" />
      <SessionButton action={switchAccount} label="Switch account" />
    </div>
  );
}
