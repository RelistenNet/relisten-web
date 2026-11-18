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
