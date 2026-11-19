'use client';

import { blogSeenCookie } from '@/lib/blogSeenCookie';
import { usePathname } from '@timber-js/app/client';
import { isBefore, parseISO, subDays } from 'date-fns';
import { useState } from 'react';
import cn from '@/lib/cn';

/** A dot for a blog post the visitor hasn't seen: on the nav's More trigger and its Blog row. */
export default function BlogNewPostDot({
  hasNewPost,
  className,
}: {
  hasNewPost: boolean;
  className?: string;
}) {
  const [seen] = blogSeenCookie.useCookie();
  const [now] = useState(() => new Date());
  const onBlog = usePathname().startsWith('/blog');

  // blog/middleware.ts sets the cookie server-side; hide the dot while on
  // /blog, and the pathname change on the way out re-reads the fresh cookie.
  const highlight = hasNewPost && !onBlog && (!seen || isBefore(parseISO(seen), subDays(now, 30)));
  if (!highlight) return null;

  return (
    <span
      aria-label="New post"
      className={cn('inline-block size-1.5 rounded-full bg-relisten-500', className)}
    />
  );
}
