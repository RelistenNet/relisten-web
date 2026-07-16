import type { MiddlewareContext } from '@timber-js/app/server';

const VALID_SEGMENT = /^[a-zA-Z0-9-]+$/;

export default async function middleware(ctx: MiddlewareContext): Promise<Response | void> {
  const ip =
    ctx.req.headers.get('cf-connecting-ip') ??
    ctx.req.headers.get('x-real-ip') ??
    ctx.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const url = new URL(ctx.req.url);
  const host = ctx.req.headers.get('host') ?? ctx.req.headers.get('x-forwarded-host') ?? 'unknown';
  const ua = ctx.req.headers.get('user-agent') ?? 'unknown';
  console.log(`[request] ${ctx.req.method} ${url.pathname} ip=${ip} host=${host} ua=${ua}`);

  ctx.headers.set('Cache-Control', 'private, no-cache, no-store');

  // Reject requests with path segments that don't look like valid slugs.
  // Prevents browser devtools requests (installHook.js.map), bots, and
  // scanners from hitting the [artistSlug] dynamic route and triggering
  // unnecessary API calls + render errors.
  const segments = new URL(ctx.req.url).pathname.split('/').filter(Boolean);
  for (const segment of segments) {
    if (!VALID_SEGMENT.test(segment)) {
      return new Response(null, { status: 404 });
    }
  }
}
