import { describe, expect, it } from 'vitest';
import { setCookieValue } from './setCookieValue';

const headers = (...cookies: string[]) => {
  const h = new Headers();
  for (const cookie of cookies) h.append('set-cookie', cookie);
  return h;
};

describe('setCookieValue', () => {
  it('reads the named cookie, ignoring the others and the attributes', () => {
    const h = headers(
      '__Host-relisten_auth=sso; Path=/; Secure',
      '__Host-relisten_csrf=CfDJ8abc_-; Path=/; Secure; HttpOnly; SameSite=Lax'
    );
    expect(setCookieValue(h, '__Host-relisten_csrf')).toBe('CfDJ8abc_-');
  });

  it('matches whole names, not prefixes', () => {
    expect(
      setCookieValue(headers('__Host-relisten_csrf_evil=x; Path=/'), '__Host-relisten_csrf')
    ).toBeNull();
  });

  it('treats a cleared cookie or no Set-Cookie as none', () => {
    expect(
      setCookieValue(headers('__Host-relisten_csrf=; Max-Age=0'), '__Host-relisten_csrf')
    ).toBeNull();
    expect(setCookieValue(headers(), '__Host-relisten_csrf')).toBeNull();
    expect(setCookieValue(headers('malformed'), '__Host-relisten_csrf')).toBeNull();
  });
});
