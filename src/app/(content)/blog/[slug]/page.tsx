/// <reference types="vite/client" />
import 'server-only';

import BlogSeenMarker from '@/components/blog/BlogSeenMarker';
import FootnotesFooter from '@/components/blog/FootnotesFooter';
import { getAuthor } from '@/lib/blog/authors';
import getPosts, { getPost } from '@/lib/blog/getPosts';
import { Link } from '@timber-js/app/client';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { format, parseISO } from 'date-fns';
import { SEGMENT_PATH } from './$segment';

const mdxModules = import.meta.glob<{ default: React.ComponentType }>('../../../../posts/*.mdx');

export default async function BlogPostPage() {
  const params = getSegmentParams(SEGMENT_PATH);

  const post = getPost(params.slug, true);

  if (!post) return deny(404);

  const postAuthors = post.authors.map(getAuthor);
  const key = `../../../../posts/${post._meta.fileName}`;
  const loader = mdxModules[key];

  if (!loader) return deny(404);

  const { default: MdxComponent } = await loader();

  return (
    <div className="blog-post">
      <BlogSeenMarker />
      {post.is_draft && (
        <div
          className="
            mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800
          "
        >
          <strong>Draft</strong> &mdash; This post is not published yet.
        </div>
      )}

      <h1 className="mb-2 text-center">{post.title}</h1>

      <div className="mb-8 flex flex-col items-center gap-1 text-sm text-foreground-muted">
        <span>{post.subtitle}</span>
        <div className="flex items-center gap-2">
          <span>
            {postAuthors.map((author, i) => (
              <span key={author.name}>
                {i > 0 && ', '}
                {author.url ? (
                  <a href={author.url} target="_blank" rel="noreferrer">
                    {author.name}
                  </a>
                ) : (
                  author.name
                )}
              </span>
            ))}
          </span>
          <span>&middot;</span>
          <time dateTime={post.date} title={format(parseISO(post.date), 'MMMM d, yyyy')}>
            {post.is_draft ? 'drafted' : 'published'} {format(parseISO(post.date), 'MMMM yyyy')}
          </time>
        </div>
      </div>

      <article className="blog-content">
        <MdxComponent />
      </article>

      <FootnotesFooter
        className="
          mt-12 hidden
          print:flex
        "
      />

      <div className="mt-12 border-t border-gray-200 pt-6">
        <Link
          href="/blog"
          className="
            text-relisten text-sm
            hover:underline
          "
        >
          &larr; Back to all posts
        </Link>
      </div>
    </div>
  );
}

export async function metadata() {
  const params = getSegmentParams(SEGMENT_PATH);
  const post = getPost(params.slug, true);

  if (!post) {
    return { robots: { index: false } };
  }

  const description = post.description ?? post.subtitle;

  return {
    title: post.title,
    description,
    robots: {
      index: !post.is_draft,
    },
    openGraph: {
      type: 'article' as const,
      title: post.title,
      description,
      siteName: 'Relisten',
      publishedTime: parseISO(post.date).toISOString(),
      authors: post.authors,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: post.title,
      description,
    },
  };
}

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return getPosts(true).map((post) => ({
    slug: post.slug,
  }));
}
