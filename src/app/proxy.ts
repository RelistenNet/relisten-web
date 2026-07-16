export default async (req: Request, next: () => Promise<Response>) => {
  const url = new URL(req.url);

  if (url.pathname === '/privacy-policy') {
    const file = await fetch(new URL('/privacy_policy.html', req.url));
    return new Response(await file.text(), {
      headers: { 'content-type': 'text/html' },
    });
  }

  if (url.pathname === '/discord') {
    return Response.redirect('https://discordapp.com/invite/73fdDSS');
  }

  return next();
};
