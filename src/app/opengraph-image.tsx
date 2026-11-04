/* oxlint-disable react/no-unknown-property */
import { ImageResponse } from 'takumi-js/response';
import { CARD_COLORS as C, RuledLabel, loadCardFonts } from '@/lib/cardStyle';

// Site-wide fallback card. Timber links the deepest opengraph-image in a page's
// segment chain, so pages with their own (blog posts) or with openGraph.images
// declared in metadata() (shows, songs) keep theirs.
export const alt = 'Relisten — recorded concerts, free and open source';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  const fonts = await loadCardFonts();

  return new ImageResponse(
    <div
      tw="flex h-full w-full flex-col items-center"
      style={{ background: C.background, padding: '64px 72px', fontFamily: 'Roboto' }}
    >
      <RuledLabel text="Relisten.net" color={C.label} fontSize={22} />

      <div tw="flex flex-1 flex-col items-center justify-center w-full" style={{ gap: 20 }}>
        <div
          tw="font-black text-center"
          style={{ color: C.headline, fontSize: 120, lineHeight: 1, letterSpacing: '-0.02em' }}
        >
          Relisten
        </div>
        <div tw="text-center text-balance" style={{ color: C.label, fontSize: 32 }}>
          Free streaming of over 4,000 bands' recorded concerts for web, mobile, and sonos
        </div>
      </div>

      <RuledLabel text="Web · iOS · Android · Sonos" color={C.muted} fontSize={18} keepCasing />
    </div>,
    { ...size, fonts }
  );
}
