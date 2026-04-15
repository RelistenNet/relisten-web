'use client';

import { useEffect, useState } from 'react';

const COOKIE_NAME = 'relisten_blog_seen';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setBlogSeenCookie() {
  const expires = new Date();
  expires.setDate(expires.getDate() + 90);
  document.cookie = `${COOKIE_NAME}=${new Date().toISOString()};path=/;expires=${expires.toUTCString()}`;
}

export default function BlogNavIndicator({ hasNewPost }: { hasNewPost: boolean }) {
  const [showDot, setShowDot] = useState(false);

  useEffect(() => {
    if (!hasNewPost) return;
    const seen = getCookie(COOKIE_NAME);
    if (!seen) {
      setShowDot(true);
      return;
    }
    // If the cookie is older than 30 days, show the dot
    const seenDate = new Date(seen);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (seenDate < thirtyDaysAgo) {
      setShowDot(true);
    }
  }, [hasNewPost]);

  if (!showDot) return null;

  return <span className="absolute -top-0.5 -right-1.5 size-2 rounded-full bg-relisten-400" />;
}
