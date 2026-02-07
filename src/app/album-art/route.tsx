/* eslint-disable react/no-unknown-property */
import 'server-only';

import { getArtistGradient } from '@/lib/artistColors';
import RelistenAPI from '@/lib/RelistenAPI';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { createZodRoute } from 'next-zod-route';
import { z } from 'zod/v4';

export const runtime = 'edge';

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
    showUuid: z.uuid({ version: 'v4' }),
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
