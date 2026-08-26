'use server';

// The one client-triggered auth mutation — everything else (login start, callback, session
// read) happens via a top-level navigation or during server rendering, not a client call.

import { accountsClient } from './accountsClient';
import { clearTokens } from './authToken';

export async function signOutAction(): Promise<void> {
  try {
    await accountsClient.post('v1/logout');
  } catch {
    // Best-effort — clear the session cookie regardless of whether the server call succeeded.
  } finally {
    clearTokens();
  }
}
