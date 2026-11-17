import 'server-only';

import type { Metadata } from '@timber-js/app/server';
import type { BrowseTarget } from '@/lib/browseTarget';
import { METADATA_BASE } from '@/lib/constants';
import { proxyStreamUrl } from '@/lib/proxyStreamUrl';
import RelistenAPI from '@/lib/RelistenAPI';

type ShowTarget = Extract<BrowseTarget, { kind: 'show' }>;

/** Head for a show or track, whichever URL shape reached it. */
export async function showMetadata({
  artistSlug,
  date,
  show,
  track,
}: ShowTarget): Promise<Metadata> {
  const artists = await RelistenAPI.fetchAllArtists();
  const name = artists?.find((a) => a.slug === artistSlug)?.name;
  if (!name) return {};

  const song = track
    ? show.sources
        ?.flatMap((source) => source.sets?.flatMap((set) => set.tracks ?? []) ?? [])
        .find((t) => t.slug === track)
    : undefined;

  const audioUrl = proxyStreamUrl(song?.mp3_url);

  return {
    title: [song?.title, date.display, name].filter(Boolean).join(' | '),
    description: [show.venue?.name, show.venue?.location].filter(Boolean).join(' '),
    openGraph: {
      ...(audioUrl ? { audio: [{ url: audioUrl }] } : {}),
      images: show.uuid
        ? [{ url: `${METADATA_BASE.origin}/album-art/${show.uuid}.png`, width: 550, height: 550 }]
        : [],
    },
  };
}
