export type FavoriteCatalogType =
  | 'artist'
  | 'show'
  | 'source'
  | 'source_track'
  | 'song'
  | 'tour'
  | 'venue';

export type FavoriteDesiredState = 'favorite' | 'not_favorite';

export interface BrowserAccountProfile {
  contract_version: number;
  user_uuid: string;
  username: string;
  username_version: number;
  username_review_needed: boolean;
  username_reviewed_at: string | null;
  username_change_available_at: string | null;
  native_session_uuid?: string;
}

export interface FavoriteSnapshotItem {
  favorite_uuid: string;
  catalog_type: FavoriteCatalogType;
  catalog_uuid: string;
  created_at: string;
  updated_at: string;
}

export interface FavoriteLibrarySnapshot {
  contract_version: number;
  library_revision: number;
  next_cursor: string;
  favorites: FavoriteSnapshotItem[];
}

export interface FavoriteLibraryChange {
  change_uuid: string;
  revision: number;
  change_type: 'favorite_added' | 'favorite_removed';
  favorite_uuid: string;
  catalog_type: FavoriteCatalogType;
  catalog_uuid: string;
  changed_at: string;
}

export interface FavoriteLibraryChanges {
  contract_version: number;
  library_revision: number;
  changes: FavoriteLibraryChange[];
  next_cursor: string;
  has_more: boolean;
}

export interface FavoriteMutationRequestItem {
  mutation_uuid: string;
  catalog_type: FavoriteCatalogType;
  catalog_uuid: string;
  desired_state: FavoriteDesiredState;
  favorite_uuid: string | null;
}

export interface FavoriteMutationBatchRequest {
  contract_version: 1;
  mutations: FavoriteMutationRequestItem[];
}

export interface FavoriteMutationResult {
  mutation_uuid: string;
  catalog_type: FavoriteCatalogType;
  catalog_uuid: string;
  desired_state: FavoriteDesiredState;
  changed: boolean;
  submitted_favorite_uuid: string | null;
  canonical_favorite_uuid: string | null;
  library_revision: number;
}

export interface FavoriteMutationBatchResponse {
  contract_version: number;
  library_revision: number;
  results: FavoriteMutationResult[];
}

export interface SessionNavigation {
  navigation_url: string;
}

interface CsrfTokenResponse {
  request_token: string;
}

export class BrowserSessionRequestError extends Error {
  constructor(public readonly status: number) {
    super(`The Relisten browser-session request failed with status ${status}.`);
    this.name = 'BrowserSessionRequestError';
  }
}

export class BrowserSessionClient {
  constructor(private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  sessionStartUrl(returnTo = '/'): string {
    requireApplicationPath(returnTo);
    const query = new URLSearchParams({ return_to: returnTo });
    return `/auth/session/start?${query}`;
  }

  getMe(): Promise<BrowserAccountProfile> {
    return this.request('/v1/me');
  }

  getLibrarySnapshot(): Promise<FavoriteLibrarySnapshot> {
    return this.request('/v1/library/snapshot');
  }

  getLibraryChanges(after: string): Promise<FavoriteLibraryChanges> {
    const query = new URLSearchParams({ after });
    return this.request(`/v1/library/changes?${query}`);
  }

  mutateFavorites(request: FavoriteMutationBatchRequest): Promise<FavoriteMutationBatchResponse> {
    return this.mutation('/v1/library/favorite-mutations:batch', request);
  }

  logout(): Promise<SessionNavigation> {
    return this.mutation('/auth/session/logout');
  }

  switchAccount(returnTo = '/'): Promise<SessionNavigation> {
    requireApplicationPath(returnTo);
    const query = new URLSearchParams({ return_to: returnTo });
    return this.mutation(`/auth/session/switch-account?${query}`);
  }

  async getCsrfToken(): Promise<string> {
    const response = await this.request<CsrfTokenResponse>('/api/user/v1/csrf');
    if (response.request_token.length === 0) {
      throw new Error('The Relisten CSRF response did not contain a request token.');
    }
    return response.request_token;
  }

  private async mutation<T>(path: string, body?: unknown): Promise<T> {
    const csrfToken = await this.getCsrfToken();
    const headers = new Headers({ 'X-Relisten-CSRF': csrfToken });
    if (body !== undefined) headers.set('content-type', 'application/json');

    return this.request(path, {
      method: 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    const response = await this.fetcher(path, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) throw new BrowserSessionRequestError(response.status);
    return (await response.json()) as T;
  }
}

function requireApplicationPath(value: string): void {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    value.includes('\\') ||
    value.includes('#')
  ) {
    throw new Error('The return path must be a relative application path.');
  }
}
