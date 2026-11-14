'use client';

import { Link } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { MapPinIcon } from 'lucide-react';
import { useState } from 'react';
import type { ShowDetail } from '@/domain/types';
import cn from '@/lib/cn';
import { albumArtSearchParams } from '@/lib/searchParams/albumArtSearchParams';
import { durationToHHMMSS } from '@/lib/utils';
import PopularityBadge from '@/ui/base/PopularityBadge';

export type ShowHeaderShow = Partial<Pick<ShowDetail, 'id' | 'venue' | 'popularity'>>;

const VENUE_PILL = `
  flex min-w-0 items-center gap-1 self-start rounded bg-text-primary/5 px-1.5 py-1 text-xs
  text-text-primary transition-colors
`;

/**
 * The top of a show's track list: album art, the venue (linking to its page),
 * where it is, how many people are listening, and the tape's length.
 */
export default function ShowHeader({
  show,
  artistSlug,
  duration,
  linkVenue,
}: {
  show: ShowHeaderShow;
  artistSlug?: string;
  /** The selected tape's length, in seconds. */
  duration?: number;
  /** Off in embeds, which stay on the show. */
  linkVenue: boolean;
}) {
  // Which show's art failed, not whether: this header stays mounted as the
  // track list moves between shows, and a flag would hide every later show's art.
  const [failedArtId, setFailedArtId] = useState<string>();
  const { venue } = show;

  const venueContent = venue?.name && (
    <>
      <MapPinIcon className="h-3 w-3 shrink-0 text-text-muted" />
      <span className="truncate">{venue.name}</span>
    </>
  );

  return (
    <div className="flex items-center gap-3 border-b border-hairline p-2">
      {/* A failed image keeps its box, so the venue and stats don't jump. */}
      {show.id && show.id === failedArtId && (
        <div aria-hidden className="size-16 shrink-0 rounded bg-surface-recessed" />
      )}
      {show.id && show.id !== failedArtId && (
        <img
          src={href(
            '/album-art/[showId].png',
            { showId: show.id },
            albumArtSearchParams.buildSearchParams({ size: '256' })
          )}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          onError={() => setFailedArtId(show.id)}
          // A server-rendered image can fail before hydration, when React
          // isn't listening yet: check on mount too.
          ref={(img) => {
            if (img?.complete && !img.naturalWidth) setFailedArtId(show.id);
          }}
          className="size-16 shrink-0 rounded bg-surface-recessed"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {venueContent &&
          (linkVenue && artistSlug && venue.slug ? (
            <Link
              href={href('/artists/[artistSlug]/venues/[venueSlug]', {
                artistSlug,
                venueSlug: venue.slug,
              })}
              title={venue.name}
              className={cn(VENUE_PILL, 'hover:bg-text-primary/10')}
            >
              {venueContent}
            </Link>
          ) : (
            <span className={VENUE_PILL} title={venue.name}>
              {venueContent}
            </span>
          ))}
        {venue?.location && (
          <div className="truncate text-xxs text-text-muted">{venue.location}</div>
        )}
        <div className="flex items-center gap-3 text-xxs text-text-muted tabular-nums">
          <PopularityBadge popularity={show.popularity} />
          {!!duration && <span>{durationToHHMMSS(duration)}</span>}
        </div>
      </div>
    </div>
  );
}
