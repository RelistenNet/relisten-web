'use client';

import { useRef, useState } from 'react';

/** Disposable pilot page; this PR must close without merging. */
export default function PreviewAuthProof() {
  const csrf = useRef<string | undefined>(undefined);
  const [result, setResult] = useState('Ready');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      setResult(JSON.stringify(await action(), null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadCsrf() {
    const response = await fetch('/api/user/v1/csrf', { cache: 'no-store' });
    if (response.ok) csrf.current = (await response.json()).request_token;
    return { status: response.status, csrfIssued: Boolean(csrf.current) };
  }

  async function invalidMutation(token: string | undefined) {
    const response = await fetch('/v1/library/favorite-mutations:batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Relisten-CSRF': token } : {}),
      },
      body: JSON.stringify({ contract_version: 1, mutations: [] }),
    });
    return { status: response.status };
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4 p-6">
      <h1>Private preview auth proof</h1>
      <p>
        Disposable diagnostics. Mutation probes send an invalid empty batch and cannot change
        favorites.
      </p>
      <a href="/auth/session/start?return_to=%2Fpreview-auth-proof">Sign in</a>{' '}
      <a href="/auth/session/start?return_to=%2Fpreview-auth-proof&select_account=true">
        Start fresh provider session
      </a>
      <div className="flex flex-wrap gap-3">
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const response = await fetch('/v1/me', { cache: 'no-store' });
              return {
                status: response.status,
                userId: response.ok ? (await response.json()).user_id : null,
              };
            })
          }
        >
          Check session
        </button>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const response = await fetch('/v1/library/snapshot', { cache: 'no-store' });
              return {
                status: response.status,
                snapshot: response.ok ? await response.json() : null,
              };
            })
          }
        >
          Read library
        </button>
        <button disabled={busy} onClick={() => run(loadCsrf)}>
          Get CSRF
        </button>
        <button disabled={busy} onClick={() => run(() => invalidMutation(undefined))}>
          Probe missing CSRF
        </button>
        <button disabled={busy} onClick={() => run(() => invalidMutation('invalid'))}>
          Probe invalid CSRF
        </button>
        <button disabled={busy} onClick={() => run(() => invalidMutation(csrf.current))}>
          Probe valid CSRF
        </button>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const response = await fetch('/auth/session/logout', {
                method: 'POST',
                headers: csrf.current ? { 'X-Relisten-CSRF': csrf.current } : {},
              });
              if (response.ok) window.location.assign((await response.json()).navigation_url);
              return { status: response.status };
            })
          }
        >
          Log out test session
        </button>
      </div>
      <pre aria-label="Proof result" className="overflow-auto whitespace-pre-wrap">
        {result}
      </pre>
    </section>
  );
}
