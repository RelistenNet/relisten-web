import { expect, test } from 'vitest';
import { createServer, request, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createBrowserSessionProxyPlugin,
  isBrowserSessionProxyRequest,
  isExpectedDevelopmentHost,
  loadBrowserSessionDevelopmentConfiguration,
  prepareBrowserSessionProxyHeaders,
  requestAuthority,
} from '../dev/browserSessionDevelopment';

test('recommends the TLS-only setup when production certificates are missing', () => {
  expect(() =>
    loadBrowserSessionDevelopmentConfiguration({
      RELISTEN_WEB_SESSION_TARGET: 'production',
      RELISTEN_LOCAL_TLS_DIR: '/path/that/does/not/exist',
    })
  ).toThrowError('Run "pnpm setup:browser-session:production" and try again.');
});

test('routes reviewed path families without deciding authorization', () => {
  expect(isBrowserSessionProxyRequest('/auth/session/start?return_to=%2F')).toBe(true);
  expect(isBrowserSessionProxyRequest('/auth/session/future-action')).toBe(true);
  expect(isBrowserSessionProxyRequest('/v1/library/changes?after=cursor')).toBe(true);
  expect(isBrowserSessionProxyRequest('/v1/library/future-mutation')).toBe(true);
  expect(isBrowserSessionProxyRequest('/api/user/v1/csrf')).toBe(true);
  expect(isBrowserSessionProxyRequest('/v1/me')).toBe(true);

  expect(isBrowserSessionProxyRequest('/auth/session-evil/start')).toBe(false);
  expect(isBrowserSessionProxyRequest('/v1/library-evil/snapshot')).toBe(false);
  expect(isBrowserSessionProxyRequest('/v1/logout')).toBe(false);
  expect(isBrowserSessionProxyRequest('/v1/not-reviewed')).toBe(false);
  expect(isBrowserSessionProxyRequest('/v1/me/')).toBe(false);
  expect(isBrowserSessionProxyRequest('/api/user/v1/csrf/')).toBe(false);
  expect(isBrowserSessionProxyRequest('/api/user/v1/me')).toBe(false);
  expect(isBrowserSessionProxyRequest('/api/status')).toBe(false);
});

test('rejects ambiguous and absolute request targets', () => {
  expect(isBrowserSessionProxyRequest('/api/user/v1/../csrf')).toBe(false);
  expect(isBrowserSessionProxyRequest('/safe/../auth/session/start')).toBe(false);
  expect(isBrowserSessionProxyRequest('https://evil.example/auth/session/start')).toBe(false);
  expect(isBrowserSessionProxyRequest('//evil.example/auth/session/start')).toBe(false);
  expect(isBrowserSessionProxyRequest('/auth/session/%2e%2e/start')).toBe(false);
});

test('allows only the fixed HTTPS development Host header', () => {
  expect(isExpectedDevelopmentHost('web.relisten.localhost:5173')).toBe(true);
  expect(isExpectedDevelopmentHost('WEB.RELISTEN.LOCALHOST:5173')).toBe(true);
  expect(isExpectedDevelopmentHost('web.relisten.localhost')).toBe(false);
  expect(isExpectedDevelopmentHost('web.relisten.localhost:5174')).toBe(false);
  expect(isExpectedDevelopmentHost('evil.example:5173')).toBe(false);
  expect(requestAuthority({ ':authority': 'web.relisten.localhost:5173' })).toBe(
    'web.relisten.localhost:5173'
  );
  expect(
    requestAuthority({ 'host': 'evil.example', ':authority': 'web.relisten.localhost:5173' })
  ).toBe('evil.example');
});

test('overwrites browser-supplied relay metadata', () => {
  const headers = {
    'origin': 'https://web.relisten.localhost:5173',
    'forwarded': 'host=evil.example',
    'x-forwarded-host': 'evil.example',
    'x-forwarded-proto': 'http',
    'x-relisten-web-origin': 'https://evil.example',
  };

  prepareBrowserSessionProxyHeaders(headers);

  expect(headers).toEqual({
    'origin': 'https://web.relisten.localhost:5173',
    'x-relisten-web-origin': 'https://web.relisten.localhost:5173',
  });
});

test('preserves request and response transport while replacing trust metadata', async () => {
  let upstreamRequest:
    | { method: string; url: string; headers: IncomingMessage['headers']; body: string }
    | undefined;
  const upstream = createServer(async (request, response) => {
    const body = await readBody(request);
    upstreamRequest = {
      method: request.method ?? '',
      url: request.url ?? '',
      headers: request.headers,
      body,
    };
    response.writeHead(307, {
      'location': 'https://auth.relisten.localhost:5443/connect/authorize',
      'set-cookie': [
        '__Host-relisten_session=opaque; Path=/; Secure; HttpOnly; SameSite=Lax',
        '__Host-relisten_csrf=antiforgery; Path=/; Secure; SameSite=Lax',
      ],
    });
    response.end();
  });
  const upstreamPort = await listen(upstream);
  const { middleware, loggedErrors } = createProxyMiddleware(`http://127.0.0.1:${upstreamPort}`);
  const frontend = createServer((request, response) => {
    middleware(request, response, () => {
      response.writeHead(404);
      response.end();
    });
  });
  const frontendPort = await listen(frontend);

  try {
    const response = await send(frontendPort, {
      path: '/v1/library/favorite-mutations:batch?source=e2e',
      method: 'POST',
      headers: {
        'host': 'web.relisten.localhost:5173',
        'origin': 'https://web.relisten.localhost:5173',
        'cookie': '__Host-relisten_session=opaque',
        'x-relisten-csrf': 'request-token',
        'x-relisten-web-origin': 'https://evil.example',
        'forwarded': 'host=evil.example',
        'x-forwarded-host': 'evil.example',
        'content-type': 'application/json',
      },
      body: '{"contract_version":1}',
    });

    expect(upstreamRequest).toMatchObject({
      method: 'POST',
      url: '/v1/library/favorite-mutations:batch?source=e2e',
      body: '{"contract_version":1}',
    });
    expect(upstreamRequest?.headers.origin).toBe('https://web.relisten.localhost:5173');
    expect(upstreamRequest?.headers.cookie).toBe('__Host-relisten_session=opaque');
    expect(upstreamRequest?.headers['x-relisten-csrf']).toBe('request-token');
    expect(upstreamRequest?.headers['x-relisten-web-origin']).toBe(
      'https://web.relisten.localhost:5173'
    );
    expect(upstreamRequest?.headers.forwarded).toBeUndefined();
    expect(upstreamRequest?.headers['x-forwarded-host']).toBeUndefined();
    expect(upstreamRequest?.headers.host).toBe(`127.0.0.1:${upstreamPort}`);
    expect(response.status).toBe(307);
    expect(response.headers.location).toBe(
      'https://auth.relisten.localhost:5443/connect/authorize'
    );
    expect(response.headers['set-cookie']).toHaveLength(2);
    expect(loggedErrors).toEqual([]);
  } finally {
    await Promise.all([close(frontend), close(upstream)]);
  }
});

test('returns a bounded private no-store response when the session target is unavailable', async () => {
  const { middleware, loggedErrors } = createProxyMiddleware('http://127.0.0.1:1');
  const frontend = createServer((request, response) => middleware(request, response, () => {}));
  const frontendPort = await listen(frontend);

  try {
    const response = await send(frontendPort, {
      path: '/v1/me',
      method: 'GET',
      headers: { host: 'web.relisten.localhost:5173' },
    });

    expect(response.status).toBe(502);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toBe('Session service unavailable.');
    expect(loggedErrors).toEqual(['[relisten-session-proxy] session service unavailable']);
  } finally {
    await close(frontend);
  }
});

type Middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => void;

function createProxyMiddleware(targetOrigin: string): {
  middleware: Middleware;
  loggedErrors: string[];
} {
  let middleware: Middleware | undefined;
  const loggedErrors: string[] = [];
  const plugin = createBrowserSessionProxyPlugin({
    profile: 'local',
    targetOrigin,
    certificate: Buffer.alloc(0),
    certificateKey: Buffer.alloc(0),
  });
  const configure = plugin.configureServer;
  if (typeof configure !== 'function') throw new Error('The proxy configure hook is unavailable.');
  configure.call(
    {} as never,
    {
      middlewares: {
        use(value: Middleware) {
          middleware = value;
        },
      },
      config: {
        logger: {
          error(value: string) {
            loggedErrors.push(value);
          },
        },
      },
    } as never
  );
  if (middleware === undefined) throw new Error('The proxy middleware was not registered.');
  return { middleware, loggedErrors };
}

async function listen(server: ReturnType<typeof createServer>): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return (server.address() as AddressInfo).port;
}

async function close(server: ReturnType<typeof createServer>): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function send(
  port: number,
  options: {
    path: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }
): Promise<{
  status: number;
  headers: IncomingMessage['headers'];
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const body = options.body ?? '';
    const outgoing = request(
      {
        host: '127.0.0.1',
        port,
        path: options.path,
        method: options.method,
        headers: {
          ...options.headers,
          ...(body.length === 0 ? {} : { 'content-length': Buffer.byteLength(body) }),
        },
      },
      async (response) => {
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: await readBody(response),
        });
      }
    );
    outgoing.on('error', () => reject(new Error('The proxy integration request failed.')));
    outgoing.end(body);
  });
}
