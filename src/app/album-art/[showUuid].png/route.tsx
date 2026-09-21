/* eslint-disable react/no-unknown-property */
import 'server-only';

import RelistenAPI from '@/lib/RelistenAPI';
import { ImageResponse } from 'takumi-js/response';
import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

function SpacedText({
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

function parseDisplayDate(displayDate: string) {
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  const parts = displayDate.split('-');
  if (parts.length === 3) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    return {
      month: months[monthIndex] || parts[1],
      day: parts[2],
      year: parts[0],
    };
  }
  return { month: '', day: '', year: displayDate };
}

const searchParams = defineSearchParams({
  size: z.coerce.number().gte(256).lte(1024).default(1024),
  debug: z.coerce.boolean().default(false),
});

export async function GET() {
  const { showUuid } = getSegmentParams(SEGMENT_PATH);

  let size: number;
  let debug: boolean;
  try {
    ({ size, debug } = searchParams.get());
  } catch {
    return new Response('Not Found', { status: 404 });
  }

  const [artists, show, fontReg, fontBold, fontMegaBold] = await Promise.all([
    RelistenAPI.fetchAllArtists(),
    RelistenAPI.fetchShowByUUID(showUuid),
    fetch('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf').then(
      (res) => res.arrayBuffer()
    ),
    fetch('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf').then(
      (res) => res.arrayBuffer()
    ),
    fetch('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-900-normal.ttf').then(
      (res) => res.arrayBuffer()
    ),
  ]);

  if (!show || !show.sources?.length) return new Response('Not Found', { status: 404 });

  const artist = artists.find((artist) => artist.uuid === show.artist_uuid);
  const artistName = artist?.name ?? 'Unknown Artist';
  const { month, day, year } = parseDisplayDate(show.display_date || '');

  const s = (base: number) => Math.round((size / 1024) * base);

  const response = new ImageResponse(
    <div
      tw="flex h-full w-full flex-col items-center justify-center text-white relative bg-[#0d1b2a]"
      style={{ padding: s(60), paddingTop: s(90) }}
    >
      {/* Artist name with horizontal rules */}
      <div tw="flex items-center w-full justify-center" style={{ gap: s(12), marginBottom: s(24) }}>
        <div tw="flex-1" style={{ height: s(1), backgroundColor: '#5a8a9e', opacity: 0.5 }} />
        <div tw="font-bold text-center text-[#8cb4c9]" style={{ fontSize: s(32) }}>
          <SpacedText gap={s(7)} wordGap={s(8)}>
            {artistName.toUpperCase()}
          </SpacedText>
        </div>
        <div tw="flex-1" style={{ height: s(1), backgroundColor: '#5a8a9e', opacity: 0.5 }} />
      </div>

      {/* Date: MONTH | DAY | YEAR */}
      <div tw="flex items-center justify-center" style={{ gap: s(32), marginBottom: s(24) }}>
        <div
          tw="flex items-center justify-end font-bold text-[#8cb4c9]"
          style={{ width: s(180), fontSize: s(60) }}
        >
          {month}
        </div>
        <div tw="bg-[#5a8a9e]" style={{ width: s(2), height: s(100) }} />
        <div
          tw="flex items-center justify-center font-bold text-[#c8e6f0] leading-none"
          style={{ fontSize: s(180) }}
        >
          {day}
        </div>
        <div tw="bg-[#5a8a9e]" style={{ width: s(2), height: s(100) }} />
        <div
          tw="flex items-center justify-start font-bold text-[#8cb4c9]"
          style={{ width: s(180), fontSize: s(60) }}
        >
          {year}
        </div>
      </div>

      {/* Venue with horizontal rules */}
      {show.venue?.name && (
        <div tw="flex flex-col items-center w-full" style={{ gap: s(6) }}>
          <div tw="flex items-center w-full justify-center" style={{ gap: s(12) }}>
            <div tw="flex-1 bg-[#5a8a9e]" style={{ height: s(1), opacity: 0.4 }} />
            <div tw="font-bold text-[#8cb4c9]" style={{ fontSize: s(28) }}>
              <SpacedText gap={s(6)} wordGap={s(8)}>
                {show.venue.name.toUpperCase()}
              </SpacedText>
            </div>
            <div tw="flex-1 bg-[#5a8a9e]" style={{ height: s(1), opacity: 0.4 }} />
          </div>
          {show.venue.location && (
            <div tw="text-[#6a94a8]" style={{ fontSize: s(22) }}>
              <SpacedText gap={s(5)} wordGap={s(8)}>
                {show.venue.location.toUpperCase()}
              </SpacedText>
            </div>
          )}
        </div>
      )}

      {/* Relisten watermark */}
      <div
        tw="absolute font-bold text-[#4a7a8e]"
        style={{
          bottom: s(28),
          right: s(28),
          fontSize: s(22),
          letterSpacing: `${s(4)}px`,
        }}
      >
        RELISTEN.NET
      </div>

      {debug && (
        <>
          {/* Vertical center line */}
          <div
            tw="absolute"
            style={{
              left: size / 2,
              top: 0,
              width: 1,
              height: size,
              backgroundColor: 'rgba(255,0,0,0.5)',
            }}
          />
          {/* Horizontal center line */}
          <div
            tw="absolute"
            style={{
              top: size / 2,
              left: 0,
              width: size,
              height: 1,
              backgroundColor: 'rgba(255,0,0,0.5)',
            }}
          />
          {/* Grid lines */}
          {[0.25, 0.75].map((pct) => (
            <>
              <div
                tw="absolute"
                style={{
                  left: size * pct,
                  top: 0,
                  width: 1,
                  height: size,
                  backgroundColor: 'rgba(255,255,0,0.3)',
                }}
              />
              <div
                tw="absolute"
                style={{
                  top: size * pct,
                  left: 0,
                  width: size,
                  height: 1,
                  backgroundColor: 'rgba(255,255,0,0.3)',
                }}
              />
            </>
          ))}
          {/* Padding boundary */}
          <div
            tw="absolute border border-green-500"
            style={{
              top: s(60),
              left: s(60),
              right: s(60),
              bottom: s(60),
              borderColor: 'rgba(0,255,0,0.4)',
            }}
          />
        </>
      )}
    </div>,
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

  response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');

  return response;
}
