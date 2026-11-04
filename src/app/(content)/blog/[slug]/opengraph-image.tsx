/* oxlint-disable react/no-unknown-property */
import { ImageResponse } from 'takumi-js/response';
import getPosts, { getPost } from '@/lib/blog/getPosts';
import { getAuthor } from '@/lib/blog/authors';
import { CARD_COLORS as C, SpacedText, loadCardFonts } from '@/lib/cardStyle';
import { format, parseISO } from 'date-fns';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export const alt = 'Relisten Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** A spaced uppercase label flanked by hairline rules, as on the album art. */
function RuledLabel({ text, color, fontSize }: { text: string; color: string; fontSize: number }) {
  return (
    <div tw="flex items-center w-full justify-center" style={{ gap: 20 }}>
      <div tw="flex-1" style={{ height: 1, backgroundColor: C.rule, opacity: 0.5 }} />
      <div tw="font-bold" style={{ color, fontSize }}>
        <SpacedText gap={Math.round(fontSize * 0.22)} wordGap={Math.round(fontSize * 0.4)}>
          {text.toUpperCase()}
        </SpacedText>
      </div>
      <div tw="flex-1" style={{ height: 1, backgroundColor: C.rule, opacity: 0.5 }} />
    </div>
  );
}

function titleSize(title: string) {
  if (title.length > 60) return 56;
  if (title.length > 36) return 66;
  return 80;
}

export default async function OGImage() {
  const { slug } = getSegmentParams(SEGMENT_PATH);
  const post = getPost(slug, true);
  const fonts = await loadCardFonts();

  const title = post?.title ?? 'Relisten Blog';
  const byline = post
    ? `${post.authors.map((a) => getAuthor(a).name).join(' & ')}  ·  ${format(parseISO(post.date), 'MMMM yyyy')}`
    : null;

  return new ImageResponse(
    <div
      tw="flex h-full w-full flex-col items-center relative"
      style={{ background: C.background, padding: '64px 72px', fontFamily: 'Roboto' }}
    >
      <RuledLabel text="Relisten.net" color={C.label} fontSize={22} />

      <div tw="flex flex-1 flex-col items-center justify-center w-full" style={{ gap: 20 }}>
        <div
          tw="font-black text-center"
          style={{
            color: C.headline,
            fontSize: titleSize(title),
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            textWrap: 'balance',
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {post?.subtitle && (
          <div tw="text-center" style={{ color: C.label, fontSize: 30 }}>
            {post.subtitle}
          </div>
        )}
      </div>

      {byline && <RuledLabel text={byline} color={C.muted} fontSize={18} />}
    </div>,
    { ...size, fonts }
  );
}

export async function generateStaticParams() {
  return getPosts(true).map((post) => ({ slug: post.slug }));
}
