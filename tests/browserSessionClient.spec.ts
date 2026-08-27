import { expect, test } from 'vitest';
import {
  BrowserSessionClient,
  BrowserSessionRequestError,
  type FavoriteMutationBatchRequest,
} from '../src/lib/browserSessionClient';

test('uses relative no-store credentialed requests for account and library reads', async () => {
  const calls: Array<{ path: string; init: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    calls.push({ path: String(input), init });
    return json({});
  };
  const client = new BrowserSessionClient(fetcher);

  await client.getMe();
  await client.getLibrarySnapshot();
  await client.getLibraryChanges('cursor value');

  expect(calls.map((call) => call.path)).toEqual([
    '/v1/me',
    '/v1/library/snapshot',
    '/v1/library/changes?after=cursor+value',
  ]);
  for (const call of calls) {
    expect(call.init.credentials).toBe('include');
    expect(call.init.cache).toBe('no-store');
  }
});

test('acquires a fresh CSRF token for each browser mutation', async () => {
  const calls: Array<{ path: string; init: RequestInit }> = [];
  let csrfSequence = 0;
  const fetcher: typeof fetch = async (input, init = {}) => {
    const path = String(input);
    calls.push({ path, init });
    if (path === '/api/user/v1/csrf') {
      csrfSequence += 1;
      return json({ request_token: `csrf-${csrfSequence}` });
    }
    return json({ navigation_url: '/auth/session/continue' });
  };
  const client = new BrowserSessionClient(fetcher);
  const request: FavoriteMutationBatchRequest = {
    contract_version: 1,
    mutations: [
      {
        mutation_uuid: '019cf000-0000-7000-8000-000000000001',
        catalog_type: 'artist',
        catalog_uuid: '019cf000-0000-7000-8000-000000000002',
        desired_state: 'favorite',
        favorite_uuid: '019cf000-0000-7000-8000-000000000003',
      },
    ],
  };

  await client.mutateFavorites(request);
  expect(await client.logout()).toEqual({ navigation_url: '/auth/session/continue' });
  expect(await client.switchAccount('/library')).toEqual({
    navigation_url: '/auth/session/continue',
  });

  expect(calls.map((call) => call.path)).toEqual([
    '/api/user/v1/csrf',
    '/v1/library/favorite-mutations:batch',
    '/api/user/v1/csrf',
    '/auth/session/logout',
    '/api/user/v1/csrf',
    '/auth/session/switch-account?return_to=%2Flibrary',
  ]);

  const firstMutation = calls[1];
  expect(new Headers(firstMutation.init.headers).get('X-Relisten-CSRF')).toBe('csrf-1');
  expect(firstMutation.init.method).toBe('POST');
  expect(firstMutation.init.body).toBe(JSON.stringify(request));
  expect(new Headers(calls[3].init.headers).get('X-Relisten-CSRF')).toBe('csrf-2');
  expect(new Headers(calls[5].init.headers).get('X-Relisten-CSRF')).toBe('csrf-3');
});

test('builds only validated relative session start URLs', () => {
  const client = new BrowserSessionClient(async () => json({}));

  expect(client.sessionStartUrl('/library?view=favorites')).toBe(
    '/auth/session/start?return_to=%2Flibrary%3Fview%3Dfavorites'
  );
  expect(() => client.sessionStartUrl('https://evil.example')).toThrow('relative application path');
  expect(() => client.sessionStartUrl('//evil.example')).toThrow('relative application path');
});

test('reports only the failed response status', async () => {
  const client = new BrowserSessionClient(async () => new Response('sensitive', { status: 401 }));

  const failure = await client.getMe().catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(BrowserSessionRequestError);
  expect((failure as BrowserSessionRequestError).status).toBe(401);
  expect((failure as Error).message).not.toContain('sensitive');
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
