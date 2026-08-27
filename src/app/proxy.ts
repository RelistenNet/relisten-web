import { proxySessionRequest } from '@/lib/session/proxy';

export default async (req: Request, next: () => Promise<Response>) => {
  const start = performance.now();
  const url = new URL(req.url);

  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const host = req.headers.get('host') ?? req.headers.get('x-forwarded-host') ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';

  const session = await proxySessionRequest(req);
  if (session) return session;

  if (url.pathname === '/privacy-policy') {
    const file = await fetch(new URL('/privacy_policy.html', req.url));
    const res = new Response(await file.text(), {
      headers: { 'content-type': 'text/html' },
    });

    return res;
  }

  if (url.pathname === '/discord') {
    return Response.redirect('https://discordapp.com/invite/73fdDSS');
  }

  const res = await next();
  const ms = (performance.now() - start).toFixed(3).padStart(3, '0');
  if (url.pathname !== '/api/status') {
    console.log(
      `[request] ${req.method} ${url.pathname} ${res.status} ${ms}ms ip=${ip} host=${host} ua=${ua}`
    );
  }
  return res;
};
