import 'server-only';

// Route-handler cookie writes, bypassing getCookieJar()/defineCookie().
//
// route.ts handlers are documented as a mutable cookie context, but the installed
// @timber-js/app@0.2.0-alpha.196 doesn't actually enable it for GET route.ts dispatch — only
// middleware.ts and server actions call setMutableCookieContext(true) before running user code
// (see node_modules/@timber-js/app/src/server/rsc-entry/api-handler.ts, which dispatches route.ts
// requests without ever flipping that flag). getCookieJar().set()/.delete() throw as a result.
// Filed as a framework gap to report upstream — newer alphas (checked: .197, .198 exist beyond
// the installed .196) may already fix it. Until then, /auth/login and /auth/callback build their
// own Set-Cookie header and append it directly to RouteContext.headers, which the framework's
// redirect/response path does forward correctly regardless of the mutable-context flag.

function cookieAttrs(maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV !== 'development' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${encodeURIComponent(value)}; ${cookieAttrs(maxAgeSeconds)}`;
}

export function serializeDeleteCookie(name: string): string {
  return `${name}=; ${cookieAttrs(0)}`;
}
