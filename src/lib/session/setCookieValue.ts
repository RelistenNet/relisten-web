/**
 * The value a response's `Set-Cookie` gives the cookie `name`, exactly as sent, or
 * null if it sets none. Attributes are ignored: this reads a value to send back to
 * the same server, never a cookie to give the browser.
 */
export function setCookieValue(headers: Headers, name: string): string | null {
  for (const raw of headers.getSetCookie()) {
    const eq = raw.indexOf('=');
    if (eq === -1 || raw.slice(0, eq).trim() !== name) continue;
    const end = raw.indexOf(';', eq);
    const value = raw.slice(eq + 1, end === -1 ? undefined : end).trim();
    return value === '' ? null : value;
  }
  return null;
}
