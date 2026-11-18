// Mirrors Relisten.Accounts.Contracts in RelistenApi. Keep in sync (or generate).

export type FavoriteCatalogType =
  | 'artist'
  | 'show'
  | 'source'
  | 'source_track'
  | 'song'
  | 'tour'
  | 'venue';

export interface AccountProfile {
  contract_version: number;
  user_uuid: string;
  username: string;
  username_version: number;
  username_review_needed: boolean;
  username_reviewed_at: string | null;
  username_change_available_at: string | null;
}

export interface FavoriteItem {
  favorite_uuid: string;
  catalog_type: FavoriteCatalogType;
  catalog_uuid: string;
  created_at: string;
  updated_at: string;
}

export interface LibrarySnapshot {
  contract_version: number;
  library_revision: number;
  next_cursor: string;
  favorites: FavoriteItem[];
}

export interface SessionNavigation {
  navigation_url: string;
}
