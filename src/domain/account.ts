// Mirrors the parts of Relisten.Accounts.Contracts (RelistenApi) that the web reads.

/** Only the fields the web reads; the contract has more. */
export interface AccountProfile {
  username: string;
}

export interface SessionNavigation {
  navigation_url: string;
}

/**
 * The outcome of a sign-out or switch-account. `navigate` goes on to the auth
 * host; `expired` means the session was already gone; `rejected` is a CSRF or
 * origin failure on a live session; `unavailable` is an outage.
 */
export type SessionNavigationResult =
  | { kind: 'navigate'; url: string }
  | { kind: 'expired' }
  | { kind: 'rejected' }
  | { kind: 'unavailable' };
