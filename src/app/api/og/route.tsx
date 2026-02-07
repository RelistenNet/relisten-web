import { getArtistGradient } from '@/lib/artistColors';
import RelistenAPI from '@/lib/RelistenAPI';
import ImageResponse from '@takumi-rs/image-response';
import { format, parseISO } from 'date-fns';
import { createZodRoute } from 'next-zod-route';
import { notFound } from 'next/navigation';
import { z } from 'zod';

const querySchema = z.object({
  showUuid: z.string().uuid(),
  size: z.coerce.number().gte(256).lte(1024).default(550),
});

export const GET = createZodRoute()
  .query(querySchema)
  .handler(async (request, context) => {
    const { showUuid, size } = context.query;

    if (!showUuid) return notFound();

    const [artists, show] = await Promise.all([
      RelistenAPI.fetchArtists(),
      RelistenAPI.fetchShowByUUID(showUuid),
    ]);

    if (!show || !show.sources?.length) return notFound();

    const artist = artists.find((a) => a.uuid === show.artist_uuid);
    const artistName = artist?.name ?? 'Unknown Artist';
    const bgGradient = getArtistGradient(show.artist_uuid || '');

    // Scale factor relative to default 550
    const s = size / 550;

    // Format display date nicely
    let displayDate = show.display_date || '';
    try {
      if (show.date) {
        displayDate = format(parseISO(show.date), 'MMMM d, yyyy');
      }
    } catch {
      // fall back to display_date
    }

    // Build setlist from first source
    const source = show.sources[0];
    const tracks: string[] = [];
    for (const set of source.sets || []) {
      for (const track of set.tracks || []) {
        if (track.title) tracks.push(track.title);
      }
    }

    // Badges
    const badges: string[] = [];
    if (show.has_soundboard_source) badges.push('SBD');
    if (show.has_streamable_flac_source) badges.push('FLAC');
    if ((show.source_count || 0) > 1) badges.push(`${show.source_count} sources`);


    return new ImageResponse(
      (
        <div
          tw="flex h-full w-full"
          style={{ backgroundImage: bgGradient }}
        >
          {/* Full layout on bright gradient — no dark overlay */}
          <div
            tw="flex flex-col h-full w-full"
            style={{ padding: `${14 * s}px ${28 * s}px` }}
          >
            {/* Show info card */}
            <div
              tw="flex flex-col"
              style={{
                // backgroundColor: 'rgba(0,0,0,0.22)',
                borderRadius: 14 * s,
                padding: `${18 * s}px ${22 * s}px`,
              }}
            >
              {/* Artist name */}
              <div
                tw="text-white font-bold"
                style={{
                  fontSize: 38 * s,
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',

                }}
              >
                {artistName}
              </div>

              {/* Date */}
              <div
                tw="text-white"
                style={{
                  fontSize: 22 * s,
                  marginTop: 6 * s,

                }}
              >
                {displayDate}
              </div>

              {/* Venue */}
              {show.venue?.name && (
                <div
                  tw="text-gray-100 opacity-80"
                  style={{
                    fontSize: 14 * s,
                    marginTop: 3 * s,
                  }}
                >
                  {show.venue.name}
                  {show.venue.location ? ` \u2014 ${show.venue.location}` : ''}
                </div>
              )}

              {/* Badges */}
              {badges.length > 0 && (
                <div tw="flex" style={{ gap: 6 * s, marginTop: 10 * s }}>
                  {badges.map((badge) => (
                    <div
                      key={badge}
                      tw="flex text-white font-bold"
                      style={{
                        fontSize: 11 * s,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 999,
                        padding: `${2 * s}px ${9 * s}px`,
                      }}
                    >
                      {badge}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Setlist — two columns */}
            {tracks.length > 0 && (
              <div
                tw="flex flex-1"
                style={{
                  marginTop: 10 * s,
                  gap: 10 * s,
                }}
              >
                {(() => {
                  const mid = Math.ceil(tracks.length / 2);
                  const col1 = tracks.slice(0, mid);
                  const col2 = tracks.slice(mid);

                  const renderCol = (items: string[], startIndex: number) =>
                    items.map((title, i) => (
                      <div
                        key={i}
                        tw="flex text-white"
                        style={{
                          fontSize: 13 * s,
                          lineHeight: 1.5,
                        }}
                      >
                        <span
                          style={{
                              opacity: 0.55,
                            width: 18 * s,
                            flexShrink: 0,
                          }}
                        >
                          {startIndex + i + 1}
                        </span>
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {title}
                        </span>
                      </div>
                    ));

                  return (
                    <>
                      <div tw="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
                        {renderCol(col1, 0)}
                      </div>
                      {col2.length > 0 && (
                        <div tw="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
                          {renderCol(col2, mid)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Branding */}
            <div tw="flex justify-end" style={{ marginTop: 6 * s }}>
              <div
                tw="text-white font-bold text-xl"
              >
                Relisten.net
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: size,
        height: size,
      }
    );
  });
