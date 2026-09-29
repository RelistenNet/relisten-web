import 'server-only';

import { allPosts } from 'content-collections';

export default function getPosts(showDrafts?: boolean) {
  let posts = [...allPosts];

  if (!(showDrafts || process.env.NODE_ENV === 'development')) {
    posts = posts.filter((p) => !p.is_draft);
  }

  if (!posts.length) return [];

  return posts.sort((a, b) => {
    // Drafts sorted by modification date first
    if (a.is_draft && !b.is_draft) return -1;
    if (!a.is_draft && b.is_draft) return 1;
    if (a.is_draft && b.is_draft) {
      return new Date(b.stats.modified).getTime() - new Date(a.stats.modified).getTime();
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export function getPost(slug: string, showDrafts?: boolean) {
  const posts = getPosts(showDrafts);
  return posts.find((p) => p.slug === slug) ?? null;
}

export function hasRecentPost(): boolean {
  const posts = getPosts();
  if (!posts.length) return false;
  const latest = new Date(posts[0].date);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return latest > thirtyDaysAgo;
}
