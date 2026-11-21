// The browser's line to the User Service's playlist API, same origin
// (docs/playlist-editing.md). The relisten.net ingress, the preview gateway and
// the dev session server route these paths; the session and CSRF cookies are
// origin-bound and ride along. Writes carry the CSRF token in X-Relisten-CSRF.
//
// Every request has a timeout. A write that fails in transit is retried with the
// same body: its command and operation IDs make the retry idempotent (the server
// replays its receipts), so a write is never applied twice.

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

type Problem = { code?: string; title?: string; detail?: string };

async function errorFor(res: Response): Promise<PlaylistWriteError> {
  const problem = (await res.json().catch(() => ({}))) as Problem;
  const code = problem.code ?? problem.title;
  const kind: PlaylistWriteErrorKind =
    // A 403 that outlasts a fresh CSRF token: the session isn't good for writes.
    res.status === 401 || res.status === 403
      ? 'signed-out'
      : res.status === 404
        ? 'not-found'
        : res.status === 409 && code === 'revision_conflict'
          ? 'conflict'
          : res.status === 409 && code === 'playlist_archived'
            ? 'archived'
            : res.status === 422 || res.status === 409
              ? 'invalid'
              : 'unavailable';
  return new PlaylistWriteError(kind, problem.detail, res.status);
}

export function createPlaylistTransport({
  // Looked up per call, so a page that swaps fetch (tests, instrumentation) is honored.
  fetch: doFetch = (input, init) => globalThis.fetch(input, init),
  origin = '',
}: {
  fetch?: typeof globalThis.fetch;
  /** For tests; the browser uses its own origin. */
  origin?: string;
} = {}): PlaylistTransport {
  let csrf: Promise<string> | null = null;

  const request = (path: string, init: RequestInit = {}) =>
    doFetch(`${origin}${path}`, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json', ...init.headers },
    });

  /** One token per page, fetched when the first write needs it. */
  const token = () =>
    (csrf ??= request('/api/user/v1/csrf').then(async (res) => {
      if (!res.ok) throw await errorFor(res);
      return ((await res.json()) as { request_token: string }).request_token;
    })).catch((err: unknown) => {
      csrf = null;
      throw err;
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

  async function write<T>(path: string, body: unknown, method = 'POST'): Promise<T> {
    let refreshed = false;
    for (let attempt = 1; ; attempt++) {
      let res: Response | null = null;
      try {
        res = await request(path, {
          method,
          headers: { 'content-type': 'application/json', 'x-relisten-csrf': await token() },
          body: JSON.stringify(body),
        });
      } catch (err) {
        if (err instanceof PlaylistWriteError) throw err; // the CSRF fetch's answer
      }
      if (res?.ok) return (res.status === 204 ? undefined : await res.json()) as T;
      // A bare 403 is a stale CSRF token (the cookie rotated): get a new one, once.
      if (res?.status === 403 && !refreshed) {
        refreshed = true;
        csrf = null;
        attempt--;
        continue;
      }
      const retryable = !res || res.status >= 500;
      if (!retryable) throw await errorFor(res as Response);
      if (attempt >= ATTEMPTS) throw new PlaylistWriteError('unavailable', undefined, res?.status);
      await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
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
        'PUT'
      ),
    report: (code, reason) =>
      write(`/v1/public-playlists/${encodeURIComponent(code)}/reports`, { reason }),
  };
}

/** The page's transport, shared by the editor and the Add to Playlist menu. */
export const playlistTransport = createPlaylistTransport();
