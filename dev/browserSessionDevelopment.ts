import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { IncomingHttpHeaders } from 'node:http';
import { createProxyServer } from 'http-proxy-3';
import type { Plugin } from 'vite';

export const LOCAL_WEB_ORIGIN = 'https://web.relisten.localhost:5173';
export const LOCAL_WEB_HOST = 'web.relisten.localhost:5173';

const LOCAL_ACCOUNTS_ORIGIN = 'https://accounts.relisten.localhost:5443';
const PRODUCTION_WEB_ORIGIN = 'https://relisten.net';
const WEB_ORIGIN_HEADER = 'x-relisten-web-origin';

export type BrowserSessionTargetProfile = 'local' | 'production';

export interface BrowserSessionDevelopmentConfiguration {
  profile: BrowserSessionTargetProfile;
  targetOrigin: string;
  certificate: Buffer;
  certificateKey: Buffer;
  targetCertificateAuthority?: string;
}

export function loadBrowserSessionDevelopmentConfiguration(
  environment: NodeJS.ProcessEnv = process.env
): BrowserSessionDevelopmentConfiguration {
  const profile = environment.RELISTEN_WEB_SESSION_TARGET ?? 'local';
  if (profile !== 'local' && profile !== 'production') {
    throw new Error('RELISTEN_WEB_SESSION_TARGET must be local or production.');
  }

  const tlsDirectory =
    environment.RELISTEN_LOCAL_TLS_DIR ??
    join(homedir(), 'Library', 'Application Support', 'Relisten', 'local-browser-session-tls');
  const certificate = readRequiredFile(join(tlsDirectory, 'relisten-local.pem'));
  const certificateKey = readRequiredFile(join(tlsDirectory, 'relisten-local-key.pem'));

  return {
    profile,
    targetOrigin: profile === 'local' ? LOCAL_ACCOUNTS_ORIGIN : PRODUCTION_WEB_ORIGIN,
    certificate,
    certificateKey,
    targetCertificateAuthority:
      profile === 'local' ? readRequiredFile(join(tlsDirectory, 'ca.pem'), 'utf8') : undefined,
  };
}

export function createBrowserSessionProxyPlugin(
  configuration: BrowserSessionDevelopmentConfiguration
): Plugin {
  return {
    name: 'relisten-browser-session-proxy',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      const proxy = createProxyServer({
        target: configuration.targetOrigin,
        changeOrigin: true,
        secure: true,
        ca: configuration.targetCertificateAuthority,
        xfwd: false,
        followRedirects: false,
        autoRewrite: false,
        cookieDomainRewrite: false,
        cookiePathRewrite: false,
        connectTimeout: 5_000,
        proxyTimeout: 30_000,
      });

      server.middlewares.use((request, response, next) => {
        if (!isExpectedDevelopmentHost(requestAuthority(request.headers))) {
          response.writeHead(403, { 'cache-control': 'private, no-store' });
          response.end();
          return;
        }

        if (!isBrowserSessionProxyRequest(request.url)) {
          next();
          return;
        }

        prepareBrowserSessionProxyHeaders(request.headers);
        proxy.web(request, response, {}, () => {
          server.config.logger.error('[relisten-session-proxy] session service unavailable');
          if (response.headersSent) {
            response.destroy();
            return;
          }

          response.writeHead(502, {
            'cache-control': 'private, no-store',
            'content-type': 'text/plain; charset=utf-8',
          });
          response.end('Session service unavailable.');
        });
      });
    },
  };
}

export function isBrowserSessionProxyRequest(rawUrl: string | undefined): boolean {
  if (rawUrl === undefined || !rawUrl.startsWith('/') || rawUrl.startsWith('//')) {
    return false;
  }

  const pathname = rawUrl.split('?', 1)[0];
  if (pathname.includes('\\') || hasAmbiguousPathSegment(pathname)) return false;

  return (
    pathname === '/v1/me' ||
    pathname === '/api/user/v1/csrf' ||
    isPathFamily(pathname, '/auth/session') ||
    isPathFamily(pathname, '/v1/library')
  );
}

export function isExpectedDevelopmentHost(host: string | undefined): boolean {
  return host?.toLowerCase() === LOCAL_WEB_HOST;
}

export function requestAuthority(headers: IncomingHttpHeaders): string | undefined {
  const authority = headers.host ?? headers[':authority'];
  return typeof authority === 'string' ? authority : undefined;
}

export function prepareBrowserSessionProxyHeaders(headers: IncomingHttpHeaders): void {
  for (const header of Object.keys(headers)) {
    if (header === 'forwarded' || header.startsWith('x-forwarded-')) {
      delete headers[header];
    }
  }

  delete headers[WEB_ORIGIN_HEADER];
  // The proxy writes the exact browser origin. Forwarding a browser-supplied
  // relay value would let an untrusted client influence OIDC callback validation.
  headers[WEB_ORIGIN_HEADER] = LOCAL_WEB_ORIGIN;
}

function isPathFamily(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function hasAmbiguousPathSegment(pathname: string): boolean {
  return pathname.split('/').some((segment) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return true;
    }
    return decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\');
  });
}

function readRequiredFile(path: string): Buffer;
function readRequiredFile(path: string, encoding: BufferEncoding): string;
function readRequiredFile(path: string, encoding?: BufferEncoding): Buffer | string {
  try {
    return encoding === undefined ? readFileSync(path) : readFileSync(path, encoding);
  } catch {
    throw new Error(
      `The browser-session development file is unavailable: ${path}. ` +
        'Run "pnpm setup:browser-session" and try again.'
    );
  }
}
