/* eslint-disable react/no-unknown-property */
import 'server-only';

import RelistenAPI from '@/lib/RelistenAPI';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { createZodRoute } from 'next-zod-route';
import { z } from 'zod';

export const runtime = 'edge';

// Function to generate a color based on artist UUID
const getArtistColor = (uuid: string) => {
  // Generate a consistent hash from the UUID
  const hash = Array.from(uuid).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

  // Use HSL color model for more systematic and beautiful variations
  // Hue: 0-360 (full color spectrum)
  // Saturation: 60-80% (more vibrant than before)
  // Lightness: 55-75% (slightly darker for more vibrant appearance)
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash >> 8) % 20); // Increased from 40-60% to 60-80%
  const lightness = 55 + (Math.abs(hash >> 16) % 20); // Adjusted from 65-85% to 55-75%

  // Return the color in HSL format
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Function to generate a gradient based on artist UUID
const getArtistGradient = (uuid: string) => {
  // Generate a base color using HSL for better control
  const baseColor = getArtistColor(uuid);

  // Create a second hash for the complementary color
  const secondHash = Array.from(uuid).reduce(
    (acc, char, i) => char.charCodeAt(0) + ((acc << ((i % 5) + 3)) - acc),
    0
  );

  // Generate complementary colors using color theory
  // Options: analogous (±30°), complementary (180°), triadic (120°), split-complementary (±150°)
  const colorSchemes = [
    30, // analogous 1
    -30, // analogous 2
    60, // harmonious 1
    -60, // harmonious 2
    120, // triadic 1
    -120, // triadic 2
    // 150, // split-complementary 1
    // -150, // split-complementary 2
    180, // complementary (used less frequently for pastels)
  ];

  // Extract HSL values from the base color
  const baseHSLMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  const baseHue = baseHSLMatch ? parseInt(baseHSLMatch[1]) : 0;
  const baseSaturation = baseHSLMatch ? parseInt(baseHSLMatch[2]) : 60;
  const baseLightness = baseHSLMatch ? parseInt(baseHSLMatch[3]) : 55;

  // Select a color scheme based on the hash
  const schemeOffset = colorSchemes[Math.abs(secondHash) % colorSchemes.length];

  // Create a complementary hue and adjust saturation/lightness for vibrant effect
  const secondHue = (baseHue + schemeOffset + 360) % 360;
  // Higher saturation but still balanced
  const secondSaturation = Math.min(Math.max(baseSaturation - (secondHash % 10), 75), 75); // Increased from 35-55% to 55-75%
  const secondLightness = Math.min(Math.max(baseLightness + (secondHash % 10), 60), 75); // Adjusted from 70-85% to 60-75%

  // Create second color in HSL format
  const secondColor = `hsl(${secondHue}, ${secondSaturation}%, ${secondLightness}%)`;

  // Determine if we should use a third color (about 1/3 of the time)

  const gradientString = `linear-gradient(135deg, ${baseColor}, ${secondColor})`;

  return gradientString;
};

// Create a pixelated pattern with large squares
const generatePixelatedSVG = (opacity = 0.4, size: number) => {
  const squareSize = (size / 1024) * 45; // Size of each pixel square
  const gridSize = 10; // Number of squares in each row/column
  const borderWidth = 1; // Reduced width of the border between pixels
  const borderColor = 'rgba(0, 0, 0, 0.1)'; // More transparent black for subtler borders

  let squares = '';
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // TODO: get rid of the randomness here.
      const squareOpacity = (Math.random() * 0.3 + 0.1) * opacity;

      squares += `<rect
        x="${x * squareSize}"
        y="${y * squareSize}"
        width="${squareSize}"
        height="${squareSize}"
        fill="white"
        fill-opacity="${squareOpacity}"
        stroke="${borderColor}"
        stroke-width="${borderWidth}"
      />`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${squareSize * gridSize}" height="${squareSize * gridSize}" viewBox="0 0 ${squareSize * gridSize} ${squareSize * gridSize}">
    ${squares}
  </svg>`;

  return `url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}")`;
};

const querySchema = z.object({
  showUuid: z.string().uuid(),
  size: z.coerce.number().gte(256).lte(1024).default(1024),
});

export const GET = createZodRoute()
  .query(querySchema)
  .handler(async (request, context) => {
    if (!context.query.showUuid) return notFound();

    const [artists, show, fontReg, fontBold, fontMegaBold] = await Promise.all([
      RelistenAPI.fetchArtists(),
      RelistenAPI.fetchShowByUUID(context.query.showUuid),
      fetch(
        new URL('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf'),
        { next: { revalidate: 60 * 60 * 24 * 30 } } // Cache for 30 days
      ).then((res) => res.arrayBuffer()),
      fetch(
        new URL('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'),
        { next: { revalidate: 60 * 60 * 24 * 30 } } // Cache for 30 days
      ).then((res) => res.arrayBuffer()),
      fetch(
        new URL('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-900-normal.ttf'),
        { next: { revalidate: 60 * 60 * 24 * 30 } } // Cache for 30 days
      ).then((res) => res.arrayBuffer()),
    ]);

    if (!show || !show.sources?.length) return notFound();

    // Get params
    const artist = artists.find((artist) => artist.uuid === show.artist_uuid);
    const artistName = artist?.name ?? 'Unknown Artist';

    // Generate dynamic background color and pattern based on artist UUID
    const bgGradient = getArtistGradient(show.artist_uuid || '');
    // Generate pixelated background pattern
    const size = context.query.size;
    const pixelatedSVG = generatePixelatedSVG(0.8, size);

    return new ImageResponse(
      (
        <div
          tw="flex h-full w-full flex-col items-center justify-center p-10 text-white relative overflow-hidden"
          style={{
            backgroundImage: `${pixelatedSVG}, ${bgGradient}`,
            backgroundBlendMode: 'overlay',
          }}
        >
          <div tw="flex w-full max-w-[800px] flex-col items-center justify-center rounded-2xl bg-black/25 p-12 relative">
            <div
              tw="mb-2 text-center font-extrabold tracking-tight"
              style={{
                fontSize: (size / 1024) * 72,
              }}
            >
              {artistName}
            </div>
            <div
              tw="mb-2 text-center font-bold"
              style={{
                fontSize: (size / 1024) * 60,
              }}
            >
              {show.display_date}
            </div>
            <div tw="flex items-center justify-center" style={{ gap: 8 }}>
              {show.venue?.name && (
                <div
                  tw="rounded-xl bg-white/20 px-6 py-3 flex text-center"
                  style={{
                    fontSize: (size / 1024) * 36,
                  }}
                >
                  {show.venue?.name} {show.venue?.location ? `• ${show.venue.location}` : ''}
                </div>
              )}
            </div>
          </div>

          <div
            tw="absolute bottom-6 right-6 font-bold"
            style={{
              fontSize: (size / 1024) * 36,
            }}
          >
            Relisten.net
          </div>
        </div>
      ),
      {
        width: size,
        height: size,
        fonts: [
          {
            name: 'Roboto',
            data: fontReg,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Roboto',
            data: fontBold,
            weight: 700,
            style: 'normal',
          },
          {
            name: 'Roboto',
            data: fontMegaBold,
            weight: 900,
            style: 'normal',
          },
        ],
      }
    );
  });
