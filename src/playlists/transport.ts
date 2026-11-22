// The browser's line to the User Service's playlist API, same origin
// (docs/playlist-editing.md). The relisten.net ingress, the preview gateway and
// the dev session server route these paths; the session and CSRF cookies are
// origin-bound and ride along. Writes carry the CSRF token in X-Relisten-CSRF.
//
// Every request has a timeout. A write that fails in transit (or on a 5xx) is
// retried with the same body: its command and operation IDs make the retry
// idempotent (the server replays its receipts), so it's never applied twice.
// Reports carry no such ID, so they aren't retried.
//
// Each write fetches its CSRF token first, so nothing is cached for the page's
// life (a sign-out or a switch of account can't leave a stale one). That's a
// request more per save; if it shows up as slow, caching it is the fix.

import type {
  CreatePlaylistRequestWire,
  LibrarySnapshotWire,
  PlaylistBatchRequestWire,
  PlaylistBatchResponseWire,
  PlaylistCreatedWire,
  PlaylistOperationWire,
  PlaylistPublicationWire,
  PlaylistSnapshotWire,
} from '@/domain/playlists';

const TIMEOUT_MS = 10_000;
/** Tries per write: the first, then retries after a network error or a 5xx. */
const ATTEMPTS = 3;

export type PlaylistWriteErrorKind =
  /** No session, or it expired. */
  | 'signed-out'
  /** Someone else changed the playlist first (`expected_revision` didn't match). */
  | 'conflict'
  /** Archived playlists can't be edited. */
  | 'archived'
  /** The server refused the edit (422): too long, bad Markdown, a quota. */
  | 'invalid'
  /** Not this listener's, or deleted. */
  | 'not-found'
  /** The network, a timeout, or the server, after retries. */
  | 'unavailable';

export class PlaylistWriteError extends Error {
  constructor(
    readonly kind: PlaylistWriteErrorKind,
    /** The server's explanation, when it gave one (a 422's `detail`). */
    readonly detail?: string,
    readonly status?: number
  ) {
    super(detail ?? kind);
  }
}

export type PlaylistTransport = {
  library(): Promise<LibrarySnapshotWire>;
  snapshot(playlistId: string): Promise<PlaylistSnapshotWire>;
  create(request: CreatePlaylistRequestWire): Promise<PlaylistCreatedWire>;
  batch(
    playlistId: string,
    operations: PlaylistOperationWire[],
    expectedRevision?: number
  ): Promise<PlaylistBatchResponseWire>;
  /** Publishes (or unpublishes) a playlist; asking twice changes nothing more. */
  publish(playlistId: string, published: boolean): Promise<PlaylistPublicationWire>;
  /** Reports a public playlist (signed in; a reason of 1–300 characters). */
  report(publicCode: string, reason: string): Promise<void>;
};

type Problem = { code?: string; detail?: string };

async function errorFor(res: Response): Promise<PlaylistWriteError> {
  const problem = (await res.json().catch(() => ({}))) as Problem;
  const kind: PlaylistWriteErrorKind =
    res.status === 401 || res.status === 403
      ? 'signed-out'
      : res.status === 404
        ? 'not-found'
        : res.status === 409 && problem.code === 'revision_conflict'
          ? 'conflict'
          : res.status === 409 && problem.code === 'playlist_archived'
            ? 'archived'
            : res.status === 422 || res.status === 409
              ? 'invalid'
              : 'unavailable';
  return new PlaylistWriteError(kind, problem.detail, res.status);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createPlaylistTransport({
  // Looked up per call, so a page that swaps fetch (tests, instrumentation) is honored.
  fetch: doFetch = (input, init) => globalThis.fetch(input, init),
  origin = '',
}: {
  fetch?: typeof globalThis.fetch;
  /** For tests; the browser uses its own origin. */
  origin?: string;
} = {}): PlaylistTransport {
  const request = (path: string, init: RequestInit = {}) =>
    doFetch(`${origin}${path}`, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json', ...init.headers },
    });

  async function read<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await request(path);
    } catch {
      throw new PlaylistWriteError('unavailable');
    }
    if (!res.ok) throw await errorFor(res);
    return (await res.json()) as T;
  }

  /**
   * One try at a write: a CSRF token, then the write with it, then its answer read
   * in full. A refusal (a 4xx, or the token's) throws; anything that failed on the
   * way (the network, a timeout, a 5xx, a body cut off) is `transit`, to retry
   * with the same request: its IDs make that safe.
   */
  async function attempt(
    path: string,
    body: unknown,
    method: string
  ): Promise<{ kind: 'ok'; body: unknown } | { kind: 'transit'; status?: number }> {
    try {
      const csrf = await request('/api/user/v1/csrf');
      // The token's endpoint failing on the way (a 5xx) is retried like the write;
      // its refusal (signed out) isn't.
      if (csrf.status >= 500) return { kind: 'transit', status: csrf.status };
      if (!csrf.ok) throw await errorFor(csrf);
      const { request_token } = (await csrf.json()) as { request_token: string };
      const res = await request(path, {
        method,
        headers: { 'content-type': 'application/json', 'x-relisten-csrf': request_token },
        body: JSON.stringify(body),
      });
      if (res.status >= 500) return { kind: 'transit', status: res.status };
      if (!res.ok) throw await errorFor(res);
      return { kind: 'ok', body: res.status === 204 ? undefined : await res.json() };
    } catch (err) {
      if (err instanceof PlaylistWriteError) throw err;
      return { kind: 'transit' };
    }
  }

  async function write<T>(
    path: string,
    body: unknown,
    { method = 'POST', tries = ATTEMPTS }: { method?: string; tries?: number } = {}
  ): Promise<T> {
    for (let n = 1; ; n++) {
      const result = await attempt(path, body, method);
      if (result.kind === 'ok') return result.body as T;
      if (n >= tries) throw new PlaylistWriteError('unavailable', undefined, result.status);
      await delay(300 * 2 ** (n - 1));
    }
  }

  return {
    library: () => read('/v1/library/snapshot'),
    snapshot: (id) => read(`/v1/playlists/${encodeURIComponent(id)}/snapshot`),
    create: (request) => write('/v1/playlists', request),
    batch: (id, operations, expectedRevision) =>
      write(`/v1/playlists/${encodeURIComponent(id)}/operations:batch`, {
        contract_version: 1,
        operations,
        ...(expectedRevision !== undefined && { expected_revision: expectedRevision }),
      } satisfies PlaylistBatchRequestWire),
    publish: (id, published) =>
      write(
        `/v1/playlists/${encodeURIComponent(id)}/publication`,
        { contract_version: 1, published },
        { method: 'PUT' }
      ),
    report: (code, reason) =>
      write(
        `/v1/public-playlists/${encodeURIComponent(code)}/reports`,
        { reason },
        // No idempotency key: a retry could file it twice.
        { tries: 1 }
      ),
  };
}

/** The page's transport, shared by the editor and the Add to Playlist menu. */
export const playlistTransport = createPlaylistTransport();
