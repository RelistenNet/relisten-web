'use client';

import { useActionState } from 'react';
import { signOut, switchAccount, type SessionFormState } from './actions';

const MESSAGES: Record<NonNullable<SessionFormState>['error'], string> = {
  rejected: 'The account service rejected the request. Reload and try again.',
  unavailable: 'The account service is temporarily unavailable.',
};

function SessionButton({ action, label }: { action: typeof signOut; label: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="underline disabled:opacity-50">
        {pending ? `${label}…` : label}
      </button>
      {state && <p className="mt-1 text-sm text-destructive">{MESSAGES[state.error]}</p>}
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
