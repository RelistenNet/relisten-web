// Mirrors Relisten.Accounts.Contracts in RelistenApi. Keep in sync (or generate).

export interface AccountProfile {
  contract_version: number;
  user_uuid: string;
  username: string;
  username_version: number;
  username_review_needed: boolean;
  username_reviewed_at: string | null;
  username_change_available_at: string | null;
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
