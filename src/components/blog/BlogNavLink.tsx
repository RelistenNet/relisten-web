'use client';

import { blogSeenCookie } from '@/lib/blogSeenCookie';
import { Link } from '@timber-js/app/client';
import { parseISO, subDays, isBefore } from 'date-fns';

export default function BlogNavLink({ hasNewPost }: { hasNewPost: boolean }) {
  const [seen] = blogSeenCookie.useCookie();

  const highlight = hasNewPost && (!seen || isBefore(parseISO(seen), subDays(new Date(), 30)));

  return (
    <Link className="nav-btn" href="/blog">
      {highlight && <span className="mr-1 size-1 rounded-full bg-relisten-500" />}
      Blog
    </Link>
  );
}
