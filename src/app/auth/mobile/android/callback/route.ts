export function GET() {
  // Android handles the verified HTTPS link. A browser that reaches this route
  // gets recovery instructions without rendering or forwarding callback parameters.
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Return to Relisten to sign in</title>
  </head>
  <body>
    <main>
      <h1>Return to Relisten to sign in</h1>
      <p>On your Android device, enable <strong>Open supported links</strong> in Relisten’s app settings. Then open Relisten and start sign-in again.</p>
    </main>
  </body>
</html>`,
    {
      headers: {
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
        'content-type': 'text/html; charset=utf-8',
        'referrer-policy': 'no-referrer',
        'x-robots-tag': 'noindex',
      },
    }
  );
}
