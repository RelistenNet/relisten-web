'use client';

import { useEffect } from 'react';
import { blogSeenCookie } from '@/lib/blogSeenCookie';

export default function BlogSeenMarker() {
  const [, setSeen] = blogSeenCookie.useCookie();

  useEffect(() => {
    setSeen(new Date().toISOString());
  }, [setSeen]);

  return null;
}
