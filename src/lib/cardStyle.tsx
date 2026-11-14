/* oxlint-disable react/no-unknown-property */
import 'server-only';
import { Buffer } from 'node:buffer';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff2?inline';
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff2?inline';
import robotoBlack from '@fontsource/roboto/files/roboto-latin-900-normal.woff2?inline';

/**
 * Shared look for generated images (album art, OG cards): navy ground,
 * Roboto, letter-spaced uppercase labels between hairline rules.
 */
export const CARD_COLORS = {
  background: '#0d1b2a',
  rule: '#5a8a9e',
  label: '#8cb4c9',
  headline: '#c8e6f0',
  muted: '#6a94a8',
  watermark: '#4a7a8e',
};

/** Renders each character as its own node so letter spacing is exact in takumi. */
export function SpacedText({
  children,
  gap,
  wordGap,
}: {
  children: string;
  gap: number;
  wordGap: number;
}) {
  return (
    <div tw="flex items-center justify-center" style={{ gap }}>
      {children
        .split('')
        .map((char, i) =>
          char === ' ' ? <div key={i} style={{ width: wordGap }} /> : <span key={i}>{char}</span>
        )}
    </div>
  );
}

// Inline imports keep the fonts inside the server bundle: image generation
// needs neither CDN access nor a Host-derived request back to this app.
function fontData(dataUrl: string) {
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

const cardFonts = [
  { name: 'Roboto', data: fontData(robotoRegular), weight: 400 as const, style: 'normal' as const },
  { name: 'Roboto', data: fontData(robotoBold), weight: 700 as const, style: 'normal' as const },
  { name: 'Roboto', data: fontData(robotoBlack), weight: 900 as const, style: 'normal' as const },
];

/** Roboto 400/700/900 in the shape takumi's `fonts` option expects. */
export async function loadCardFonts() {
  return cardFonts;
}

/** A spaced uppercase label flanked by hairline rules. */
export function RuledLabel({
  text,
  color,
  fontSize,
  keepCasing,
}: {
  text: string;
  color: string;
  fontSize: number;
  keepCasing?: boolean;
}) {
  return (
    <div tw="flex items-center w-full justify-center" style={{ gap: 20 }}>
      <div tw="flex-1" style={{ height: 1, backgroundColor: CARD_COLORS.rule, opacity: 0.5 }} />
      <div tw="font-bold" style={{ color, fontSize }}>
        <SpacedText gap={Math.round(fontSize * 0.22)} wordGap={Math.round(fontSize * 0.4)}>
          {keepCasing ? text : text.toUpperCase()}
        </SpacedText>
      </div>
      <div tw="flex-1" style={{ height: 1, backgroundColor: CARD_COLORS.rule, opacity: 0.5 }} />
    </div>
  );
}
