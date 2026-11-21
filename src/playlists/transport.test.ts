import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaylistTransport, PlaylistWriteError } from './transport';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const batchOk = { contract_version: 1, history_generation: 'g', head_revision: 2, results: [] };

/** A fetch that answers each call from the list, and records what it was sent. */
function fakeFetch(answers: (Response | Error)[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = answers.shift();
    if (!next) throw new Error(`unexpected request ${String(url)}`);
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const csrf = (token = 'tok') => json(200, { request_token: token });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createPlaylistTransport', () => {
  it('fetches a CSRF token for each write and sends it', async () => {
    const { fetch, calls } = fakeFetch([
      csrf('a'),
      json(200, batchOk),
      csrf('b'),
      json(200, batchOk),
    ]);
    const t = createPlaylistTransport({ fetch });
    await t.batch('playlist_1', [], 4);
    await t.batch('playlist_1', []);
    expect(calls.map((c) => c.url)).toEqual([
      '/api/user/v1/csrf',
      '/v1/playlists/playlist_1/operations:batch',
      '/api/user/v1/csrf',
      '/v1/playlists/playlist_1/operations:batch',
    ]);
    const tokens = [calls[1], calls[3]].map((c) =>
      new Headers(c.init?.headers).get('x-relisten-csrf')
    );
    expect(tokens).toEqual(['a', 'b']);
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      contract_version: 1,
      operations: [],
      expected_revision: 4,
    });
  });

  it('doesn’t retry a report (it has no idempotency key)', async () => {
    const { fetch, calls } = fakeFetch([csrf(), json(503, {})]);
    const error = await createPlaylistTransport({ fetch })
      .report('abc', 'Spam')
      .catch((e: unknown) => e);
    expect((error as PlaylistWriteError).kind).toBe('unavailable');
    expect(calls).toHaveLength(2);
  });

  it('retries a write that failed in transit, with the same body', async () => {
    const { fetch, calls } = fakeFetch([
      csrf(),
      new TypeError('network'),
      csrf(),
      json(503, {}),
      csrf(),
      json(200, batchOk),
    ]);
    const pending = createPlaylistTransport({ fetch }).batch('playlist_1', [], 1);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual(batchOk);
    const bodies = calls.filter((c) => c.url.endsWith(':batch')).map((c) => c.init?.body);
    expect(new Set(bodies).size).toBe(1);
  });

  it('reports what went wrong, without retrying refusals', async () => {
    const cases: [Response, string][] = [
      [json(401, {}), 'signed-out'],
      [json(403, {}), 'signed-out'],
      [json(404, {}), 'not-found'],
      [json(409, { code: 'revision_conflict' }), 'conflict'],
      [json(409, { code: 'playlist_archived' }), 'archived'],
      [json(422, { code: 'invalid_playlist_operation', detail: 'Too long.' }), 'invalid'],
    ];
    for (const [response, kind] of cases) {
      const { fetch, calls } = fakeFetch([csrf(), response]);
      const error = await createPlaylistTransport({ fetch })
        .batch('playlist_1', [])
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(PlaylistWriteError);
      expect((error as PlaylistWriteError).kind).toBe(kind);
      expect(calls).toHaveLength(2);
    }
  });

  it('gives up after three tries', async () => {
    const { fetch } = fakeFetch([
      csrf(),
      json(502, {}),
      csrf(),
      json(502, {}),
      csrf(),
      json(502, {}),
    ]);
    const pending = createPlaylistTransport({ fetch })
      .batch('playlist_1', [])
      .catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    expect(((await pending) as PlaylistWriteError).kind).toBe('unavailable');
  });
});
