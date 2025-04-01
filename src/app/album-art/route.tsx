/* eslint-disable react/no-unknown-property */
import 'server-only';

import { fetchArtists, fetchShowByUUID } from '@/app/queries';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import React from 'react';

export const runtime = 'edge';

const notFound = () =>
  new Response('Not Found', {
    status: 404,
  });

// Function to generate a color based on artist UUID
const getArtistColor = (uuid: string) => {
  // Generate a consistent color based on the UUID
  const hash = Array.from(uuid).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

  // Map to a curated set of Tailwind colors
  const tailwindColors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#8b5cf6', // violet-500
    '#ef4444', // red-500
    '#f59e0b', // amber-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#8b5cf6', // violet-500
    '#0ea5e9', // sky-500
    '#22c55e', // green-500
    '#dc2626', // red-600
    '#0d9488', // teal-600
  ];

  return tailwindColors[Math.abs(hash) % tailwindColors.length];
};

// Function to generate a gradient based on artist UUID
const getArtistGradient = (uuid: string) => {
  const baseColor = getArtistColor(uuid);

  // Create complementary color pairs for beautiful gradients using Tailwind colors
  const gradientPairs = {
    '#3b82f6': '#8b5cf6', // blue-500 to violet-500
    '#10b981': '#06b6d4', // emerald-500 to cyan-500
    '#8b5cf6': '#3b82f6', // violet-500 to blue-500
    '#ef4444': '#f97316', // red-500 to orange-500
    '#f59e0b': '#ef4444', // amber-500 to red-500
    '#06b6d4': '#10b981', // cyan-500 to emerald-500
    '#f97316': '#f59e0b', // orange-500 to amber-500
    // '#8b5cf6': '#a855f7', // violet-500 to purple-500
    '#0ea5e9': '#3b82f6', // sky-500 to blue-500
    '#22c55e': '#10b981', // green-500 to emerald-500
    '#dc2626': '#ef4444', // red-600 to red-500
    '#0d9488': '#06b6d4', // teal-600 to cyan-500
  };

  const secondColor = gradientPairs[baseColor] || '#8b5cf6'; // Default to violet-500

  return `linear-gradient(135deg, ${baseColor}, ${secondColor})`;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const showUuid = searchParams.get('showUuid');
    if (!showUuid) return notFound();

    const artists = await fetchArtists();
    const show = await fetchShowByUUID(showUuid);

    if (!show || !show.sources?.length) return notFound();

    // Get params
    const artist = artists.find((artist) => artist.uuid === show.artist_uuid);
    const artistName = artist?.name ?? 'Unknown Artist';

    // Generate dynamic background color and pattern based on artist UUID
    const bgGradient = getArtistGradient(show.artist_uuid || '');

    // Generate a pattern of circles for the background based on artist UUID
    const patternSeed = parseInt(show.artist_uuid?.replace(/\D/g, '').slice(0, 8) || '0', 10);
    const patternElements: React.ReactNode[] = [];

    for (let i = 0; i < 5; i++) {
      const size = 100 + (patternSeed % 200);
      const x = (patternSeed * (i + 1)) % 900;
      const y = (patternSeed * (i + 2)) % 900;
      const opacity = 0.1 + i * 0.05;

      patternElements.push(
        <div
          key={i}
          tw="absolute rounded-full"
          style={{
            width: size,
            height: size,
            left: x,
            top: y,
            background: 'white',
            opacity: opacity,
            filter: 'blur(40px)',
          }}
        />
      );
    }

    // Fetch Roboto font
    const fontReg = await fetch(
      new URL('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf')
    ).then((res) => res.arrayBuffer());

    const fontBold = await fetch(
      new URL('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf')
    ).then((res) => res.arrayBuffer());

    const fontMegaBold = await fetch(
      new URL('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-900-normal.ttf')
    ).then((res) => res.arrayBuffer());

    return new ImageResponse(
      (
        <div
          tw="flex h-full w-full flex-col items-center justify-center p-10 text-white relative overflow-hidden"
          style={{ background: bgGradient }}
        >
          <div tw="flex w-full max-w-[800px] flex-col items-center justify-center rounded-xl bg-black/10 p-10">
            <div tw="mb-2 text-center text-7xl font-extrabold">{artistName}</div>
            <div tw="mb-2 text-center text-6xl font-bold">{show.display_date}</div>
            <div tw="flex items-center justify-center" style={{ gap: 4 }}>
              {show.venue?.name && (
                <div tw="rounded-lg bg-white/20 px-4 py-2 text-4xl flex">
                  {show.venue?.name} {show.venue?.location ?? ''}
                </div>
              )}
            </div>
          </div>
          <div tw="absolute bottom-5 right-5 text-4xl opacity-80 font-bold">Relisten.net</div>
          {patternElements}
        </div>
      ),
      {
        width: 1024,
        height: 1024,
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
  } catch (error) {
    console.error('Error generating album art:', error);
    return new Response('Error generating album art', { status: 500 });
  }
}
