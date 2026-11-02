import { blogSeenCookie } from '@/lib/blogSeenCookie';

// Stamp the "seen the blog" cookie on every /blog request (document or client
// navigation). BlogNavLink re-reads it via useCookie once the pathname leaves
// /blog, so no client effect is needed.
export default function middleware() {
  blogSeenCookie.set(new Date().toISOString());
}
