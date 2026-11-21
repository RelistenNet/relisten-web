/* oxlint-disable react/no-unknown-property */
import 'server-only';

import { ImageResponse } from 'takumi-js/response';
import { getArtistDirectory } from '@/data/artists';
import { getPlaylistCatalog, getPublicPlaylist } from '@/data/playlists';
import { getArtistColor } from '@/lib/artistColors';
import { CARD_COLORS as C, RuledLabel, loadCardFonts } from '@/lib/cardStyle';
import { numberFormat } from '@/lib/utils';
import { readableDuration } from './PlaylistArticle';

// A published playlist's link preview (RE-53): its name, who made it, the artists
// in it (in their Relisten colors), and how much there is. Never its prose: a
// description is the author's, and a preview travels further than the page.
// Unpublished, archived or taken down: no image (404).

export const PLAYLIST_CARD_SIZE = { width: 1200, height: 630 };

/** Shown artists; the rest are counted. */
const MAX_ARTISTS = 4;

function titleSize(title: string) {
  if (title.length > 60) return 56;
  if (title.length > 32) return 68;
  return 84;
}

export async function playlistCard(publicCode: string): Promise<Response> {
  const playlist = await getPublicPlaylist(publicCode).catch(() => null);
  if (!playlist) return new Response('Not found', { status: 404 });
  const [catalog, directory, fonts] = await Promise.all([
    getPlaylistCatalog(playlist),
    getArtistDirectory(),
    loadCardFonts(),
  ]);

  // Artists by how many of the playlist's tracks they play, most first.
  const counts = new Map<string, number>();
  let tracks = 0;
  let seconds = 0;
  for (const segment of playlist.segments) {
    for (const entry of segment.entries) {
      const track = entry.trackId ? catalog.tracks[entry.trackId] : undefined;
      const show = track && catalog.shows[track.showId];
      if (!track || !show) continue;
      tracks++;
      seconds += track.duration ?? 0;
      counts.set(show.artistId, (counts.get(show.artistId) ?? 0) + 1);
    }
  }
  const artists = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => ({ id, name: directory.byId.get(id)?.name }))
    .filter((a): a is { id: string; name: string } => !!a.name);
  const shown = artists.slice(0, MAX_ARTISTS);
  const more = artists.length - shown.length;
  const stats = [
    `${numberFormat.format(tracks)} ${tracks === 1 ? 'track' : 'tracks'}`,
    seconds > 0 && readableDuration(seconds),
  ]
    .filter(Boolean)
    .join('  ·  ');

  return new ImageResponse(
    <div
      tw="flex h-full w-full flex-col items-center"
      style={{ background: C.background, padding: '64px 72px', fontFamily: 'Roboto' }}
    >
      <RuledLabel text="Relisten.net · Playlist" color={C.label} fontSize={22} />

      <div tw="flex flex-1 flex-col items-center justify-center w-full" style={{ gap: 22 }}>
        <div
          tw="font-black text-center"
          style={{
            color: C.headline,
            fontSize: titleSize(playlist.name),
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            textWrap: 'balance',
            maxWidth: 1000,
          }}
        >
          {playlist.name}
        </div>
        <div tw="text-center" style={{ color: C.label, fontSize: 30 }}>
          {`by ${playlist.owner}`}
        </div>
        {shown.length > 0 && (
          <div tw="flex flex-wrap items-center justify-center" style={{ gap: 14, marginTop: 8 }}>
            {shown.map((a) => (
              <div
                key={a.id}
                tw="flex items-center font-bold"
                style={{
                  gap: 10,
                  padding: '8px 18px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  color: C.headline,
                  fontSize: 24,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: getArtistColor(a.id),
                  }}
                />
                {a.name}
              </div>
            ))}
            {more > 0 && (
              <div tw="flex" style={{ color: C.muted, fontSize: 24 }}>
                {`+${more} more`}
              </div>
            )}
          </div>
        )}
      </div>

      <RuledLabel text={stats} color={C.muted} fontSize={18} keepCasing />
    </div>,
    { ...PLAYLIST_CARD_SIZE, fonts }
  );
}
