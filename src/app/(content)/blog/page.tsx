import getPosts from '@/lib/blog/getPosts';
import { getAuthor } from '@/lib/blog/authors';
import BlogSeenMarker from '@/components/blog/BlogSeenMarker';
import { format, parseISO } from 'date-fns';
import { Link } from '@timber-js/app/client';

export const metadata = {
  title: 'Blog',
  description: 'News, updates, and stories from the Relisten team.',
};

export default function BlogIndex() {
  const posts = getPosts();

  return (
    <div>
      <BlogSeenMarker />
      <h1 className="mb-8">Blog</h1>

      {posts.length === 0 && (
        <p className="text-foreground-muted">No posts yet. Check back soon.</p>
      )}

      <div className="flex flex-col gap-4">
        {posts.map((post) => {
          const postAuthors = post.authors.map(getAuthor);

          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block hover:no-underline"
            >
              <h2
                className="
                  mb-0 text-lg font-semibold text-relisten-600
                  hover:underline
                "
              >
                {post.is_draft && (
                  <span
                    className="
                      mr-2 rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs font-medium
                      text-yellow-800
                    "
                  >
                    DRAFT
                  </span>
                )}
                {post.title}
              </h2>
              <p className="mb-0 text-sm text-foreground-muted">
                <time dateTime={post.date} title={format(parseISO(post.date), 'MMMM d, yyyy')}>
                  {format(parseISO(post.date), 'MMMM yyyy')}
                </time>
                <span className="mx-1">&middot;</span>
                {postAuthors.map((a, i) => (
                  <span key={a.name}>
                    {i > 0 && ', '}
                    {a.name}
                  </span>
                ))}
                <span className="mx-1">&middot;</span>
                {post.subtitle}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
