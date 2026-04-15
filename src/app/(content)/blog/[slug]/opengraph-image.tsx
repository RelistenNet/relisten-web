import ImageResponse from '@takumi-rs/image-response';
import { getPost } from '@/lib/blog/getPosts';
import { getAuthor } from '@/lib/blog/authors';
import { format, parseISO } from 'date-fns';
import getPosts from '@/lib/blog/getPosts';

export const alt = 'Relisten Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug, true);

  if (!post) {
    return new ImageResponse(
      <div
        tw="flex h-full w-full items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #009DC1 0%, #001D24 100%)' }}
      >
        <div tw="text-white font-bold" style={{ fontSize: 48 }}>
          Relisten Blog
        </div>
      </div>,
      size
    );
  }

  const postAuthors = post.authors.map(getAuthor);
  const displayDate = format(parseISO(post.date), 'MMMM d, yyyy');

  return new ImageResponse(
    <div
      tw="flex h-full w-full flex-col justify-between p-12"
      style={{
        background: 'linear-gradient(135deg, #009DC1 0%, #001D24 100%)',
      }}
    >
      <div tw="flex flex-col">
        <div
          tw="text-white font-bold"
          style={{
            fontSize: 48,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          {post.title}
        </div>

        <div
          tw="text-white/80"
          style={{
            fontSize: 24,
            marginTop: 12,
          }}
        >
          {post.subtitle}
        </div>
      </div>

      <div tw="flex items-center justify-between">
        <div tw="flex items-center">
          <div tw="flex flex-col">
            <div tw="text-white" style={{ fontSize: 20 }}>
              {postAuthors.map((a) => a.name).join(', ')}
            </div>
            <div tw="text-white/60" style={{ fontSize: 16, marginTop: 4 }}>
              {displayDate}
            </div>
          </div>
        </div>

        <div tw="text-white font-bold" style={{ fontSize: 24 }}>
          Relisten.net
        </div>
      </div>
    </div>,
    size
  );
}

export async function generateStaticParams() {
  return getPosts(true).map((post) => ({ slug: post.slug }));
}
