/* oxlint-disable react/no-unknown-property */
import 'server-only';

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

// Pinned fontsource version; fonts are fetched once per process and reused.
const FONT_BASE = 'https://cdn.jsdelivr.net/fontsource/fonts/roboto@5.3.0';

async function fetchFont(weight: number): Promise<ArrayBuffer> {
  const res = await fetch(`${FONT_BASE}/latin-${weight}-normal.ttf`);
  if (!res.ok) throw new Error(`Failed to load Roboto ${weight}: ${res.status}`);
  return res.arrayBuffer();
}

let fontsPromise: Promise<[ArrayBuffer, ArrayBuffer, ArrayBuffer]> | undefined;

function loadFontData() {
  fontsPromise ??= Promise.all([fetchFont(400), fetchFont(700), fetchFont(900)]).catch((err) => {
    // Don't cache failures; retry on the next request.
    fontsPromise = undefined;
    throw err;
  });
  return fontsPromise;
}

/** Roboto 400/700/900 in the shape takumi's `fonts` option expects. */
export async function loadCardFonts() {
  const [regular, bold, black] = await loadFontData();
  return [
    { name: 'Roboto', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Roboto', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Roboto', data: black, weight: 900 as const, style: 'normal' as const },
  ];
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
