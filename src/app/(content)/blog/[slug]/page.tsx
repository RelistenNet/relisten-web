/// <reference types="vite/client" />
import 'server-only';

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
    <div>
      {post.is_draft && (
        <div
          className="
            mb-8 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm
            text-foreground/80
          "
        >
          <strong>Draft</strong> &mdash; This post is not published yet.
        </div>
      )}

      <header className="mb-10 text-center">
        <h1 className="mb-2 text-[2.25rem] leading-[1.1] font-black tracking-tight text-balance sm:text-[2.5rem]">
          {post.title}
        </h1>
        <p className="mb-0 text-[13px] text-foreground/80">
          {post.subtitle && (
            <>
              <span className="">{post.subtitle}</span>
              <span className="mx-1.5">&middot;</span>
            </>
          )}
          {postAuthors.map((author, i) => (
            <span key={author.name}>
              {i > 0 && ', '}
              {author.url ? (
                <a
                  href={author.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-inherit hover:text-foreground"
                >
                  {author.name}
                </a>
              ) : (
                author.name
              )}
            </span>
          ))}
          <span className="mx-1.5">&middot;</span>
          <time dateTime={post.date} title={format(parseISO(post.date), 'MMMM d, yyyy')}>
            {post.is_draft ? 'drafted' : 'published'} {format(parseISO(post.date), 'MMMM yyyy')}
          </time>
        </p>
      </header>

      <article className="blog-content">
        <MdxComponent />
      </article>

      <FootnotesFooter
        className="
          mt-12 hidden
          print:flex
        "
      />

      <footer
        className="
          mt-14 flex items-baseline justify-between gap-4 border-t border-hairline pt-5 text-[13px]
          text-foreground/60
        "
      >
        <Link href="/blog" className="text-inherit hover:text-foreground">
          &larr; All posts
        </Link>
        <div className="text-right">
          Have a thought?
          <a
            href="mailto:team@relisten.net"
            className="ml-2 text-foreground/85 underline decoration-foreground/30 underline-offset-4 hover:text-foreground"
            rel="nofollow"
          >
            Please email us!
          </a>
        </div>
      </footer>
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
