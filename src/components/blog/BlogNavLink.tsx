'use client';

import { blogSeenCookie } from '@/lib/blogSeenCookie';
import { Link } from '@timber-js/app/client';
import { parseISO, subDays, isBefore } from 'date-fns';

export default function BlogNavLink({ hasNewPost }: { hasNewPost: boolean }) {
  const [seen] = blogSeenCookie.useCookie();

  const highlight = hasNewPost && (!seen || isBefore(parseISO(seen), subDays(new Date(), 30)));

  return (
    <Link className="nav-btn" href="/blog">
      {highlight && <span className="size-1 mr-1 bg-relisten-500 rounded-full" />}
      Blog
    </Link>
  );
}
