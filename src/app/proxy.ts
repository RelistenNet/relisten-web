import { getDeploymentEnvironment } from '@/lib/deployment/server';
import { trace } from '@opentelemetry/api';
// Bundled at build time so we never fetch from a Host-header-derived origin.
import privacyPolicyHtml from '../../public/privacy_policy.html?raw';

async function handleRequest(req: Request, next: () => Promise<Response>) {
  const start = performance.now();
  const url = new URL(req.url);

  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  if (ip !== 'unknown') trace.getActiveSpan()?.setAttribute('client.address', ip);
  const host = req.headers.get('host') ?? req.headers.get('x-forwarded-host') ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';

  if (url.pathname === '/privacy-policy') {
    return new Response(privacyPolicyHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (url.pathname === '/discord') {
    return Response.redirect('https://discordapp.com/invite/73fdDSS');
  }

  const res = await next();
  const ms = (performance.now() - start).toFixed(3).padStart(3, '0');
  if (url.pathname !== '/api/status') {
    console.info(
      `[request] ${req.method} ${url.pathname} ${res.status} ${ms}ms ip=${ip} host=${host} ua=${ua}`
    );
  }
  return res;
}

export default async (req: Request, next: () => Promise<Response>) => {
  const response = await handleRequest(req, next);
  if (!getDeploymentEnvironment().isPreview) return response;

  // Redirect responses may have immutable headers. Preserve their status/body
  // while adding noindex to every preview response, including short circuits.
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
