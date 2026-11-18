'use client';

import { useActionState } from 'react';
import { readFormErrors } from '@timber-js/app/client';
import { signOut, switchAccount } from './actions';

const MESSAGES: Record<string, string> = {
  SESSION_REJECTED: 'The account service rejected the request. Reload and try again.',
  SESSION_UNAVAILABLE: 'The account service is temporarily unavailable.',
};

function SessionButton({ action, label }: { action: typeof signOut; label: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const code = readFormErrors(state).server?.code;
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="underline disabled:opacity-50">
        {pending ? `${label}…` : label}
      </button>
      {code && (
        <p className="mt-1 text-sm text-destructive">{MESSAGES[code] ?? 'Something went wrong.'}</p>
      )}
    </form>
  );
}

/** Plain forms: they work without JS, and add pending state and errors with it. */
export default function SessionForms() {
  return (
    <div className="flex gap-4">
      <SessionButton action={signOut} label="Sign out" />
      <SessionButton action={switchAccount} label="Switch account" />
    </div>
  );
}
