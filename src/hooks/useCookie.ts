'use client';

import { useState, useCallback } from 'react';

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

interface CookieOptions {
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
}

export function useCookie(name: string, options: CookieOptions = {}) {
  const [value, setValue] = useState(() => getCookie(name));

  const setCookie = useCallback(
    (newValue: string) => {
      const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(newValue)}`];
      parts.push(`path=${options.path ?? '/'}`);
      if (options.maxAge) parts.push(`max-age=${options.maxAge}`);
      parts.push(`samesite=${options.sameSite ?? 'lax'}`);
      document.cookie = parts.join('; ');
      setValue(newValue);
    },
    [name, options.path, options.maxAge, options.sameSite]
  );

  return [value, setCookie] as const;
}
