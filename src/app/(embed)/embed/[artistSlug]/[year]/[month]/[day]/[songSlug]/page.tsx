'use client';

import PlayerManager from '@/components/PlayerManager';
import SongsColumn from '@/components/SongsColumn';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import { playImmediatelySearchParamsLoader } from '@/lib/searchParams/playImmediatelySearchParam';
import { useEffect, useState } from 'react';

export default function EmbedSongPage(props: { params: Promise<RawParams> }) {
  const [params, setParams] = useState<RawParams | null>(null);
  const [show, setShow] = useState(null);
  const [{ playImmediately }] = playImmediatelySearchParamsLoader.useQueryStates();

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await props.params;
      setParams(resolvedParams);
      
      const { artistSlug, year, month, day } = resolvedParams;
      if (!year || !month || !day) return;
      
      const showData = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));
      setShow(showData);
    }
    loadData();
  }, [props.params]);

  if (!params || !show) {
    return <div>Loading...</div>;
  }

  const { artistSlug, year, month, day } = params;

  return (
    <div className="flex h-full">
      <div className="w-full flex-shrink-0 overflow-y-auto border-r px-2">
        <SongsColumn
          artistSlug={artistSlug}
          year={year}
          month={month}
          day={day}
          show={show}
          routePrefix="/embed"
        />
      </div>
      <PlayerManager {...params} show={show} routePrefix="/embed" playImmediately={playImmediately} />
    </div>
  );
}

export const generateMetadata = async (props) => {
  const [params, artists] = await Promise.all([props.params, RelistenAPI.fetchArtists()]);
  const { artistSlug, year, month, day, songSlug } = params;

  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return notFound();
  if (!year || !month || !day) return notFound();

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  const songs = show?.sources
    ?.map((source) => source?.sets?.map((set) => set?.tracks).flat())
    .flat();

  const song = songs?.find((song) => song?.slug === songSlug);

  return {
    title: [song?.title, createShowDate(year, month, day), name].filter((x) => x).join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    openGraph: {
      audio: [
        {
          url: song?.mp3_url,
        },
      ],
    },
  };
};
