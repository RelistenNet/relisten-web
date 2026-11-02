'use client';

import { blogSeenCookie } from '@/lib/blogSeenCookie';
import { Link, usePathname } from '@timber-js/app/client';
import { isBefore, parseISO, subDays } from 'date-fns';
import { useState } from 'react';

export default function BlogNavLink({ hasNewPost }: { hasNewPost: boolean }) {
  const [seen] = blogSeenCookie.useCookie();
  const [now] = useState(() => new Date());
  const onBlog = usePathname().startsWith('/blog');

  // blog/middleware.ts sets the cookie server-side; hide the dot while on
  // /blog, and the pathname change on the way out re-reads the fresh cookie.
  const highlight = hasNewPost && !onBlog && (!seen || isBefore(parseISO(seen), subDays(now, 30)));

  return (
    <Link className="nav-btn" href="/blog">
      {highlight && <span className="mr-1 size-1 rounded-full bg-relisten-500" />}
      Blog
    </Link>
  );
}
