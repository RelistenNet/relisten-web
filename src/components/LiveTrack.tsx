import { Link } from '@timber-js/app/client';
import { motion } from 'framer-motion';
import TimeAgo from 'react-timeago';

import { ArrowRight } from 'lucide-react';
import { LiveHistoryItem, Track, TrackSource, Venue } from '../types';

const getVenueInfo = (track: TrackSource): Venue | undefined => {
  if (track.artist && track.artist.features) {
    if (track.artist.features.per_show_venues && track.artist.features.per_source_venues) {
      return track.show?.venue;
    }

    if (track.artist.features.per_show_venues) {
      return track.show?.venue;
    }

    return track.venue;
  }
};

type VenueInfoProps = {
  track: {
    track: Track;
    source: TrackSource;
  };
};

const VenueInfo = ({ track }: VenueInfoProps) => {
  const info = getVenueInfo(track.source);
  return info ? (
    <div className="space-y-1">
      <div className="text-foreground-muted">{track.source.display_date}</div>
      <div className="line-clamp-1">
        {info.name} · {info.location}
      </div>
    </div>
  ) : (
    <div className="text-foreground-muted">{track.source.display_date}</div>
  );
};

// shorten date
const formatterFn = (value: number, unit: string) => value + unit.slice(0, 1);

type LiveTrackProps = LiveHistoryItem & {
  isLastSeen?: boolean;
};

export default function LiveTrack({
  app_type_description = '',
  created_at,
  track,
  isLastSeen,
}: LiveTrackProps) {
  if (!track?.track) return null;
  const [year, month, day] = track.source?.display_date?.split('-') ?? [];

  return (
    <Link
      href="/[artistSlug]/[year]/[month]/[day]/[songSlug]"
      segmentParams={{
        artistSlug: String(track.source.artist?.slug),
        year,
        month,
        day,
        songSlug: track?.track.slug ?? '',
      }}
      searchParams={{
        sourceId: String(track.source.id),
      }}
      prefetch={false}
      className="group h-full"
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300,
        }}
        className={`
          relative h-full rounded-xl border border-hairline bg-surface-raised p-4 shadow-sm transition-all
          duration-200
          hover:border-accent/40 hover:shadow-lg
          ${isLastSeen ? 'border-accent/60 ring-2 ring-accent/20' : ''}
        `}
        data-is-last-seen={isLastSeen}
      >
        {/* New track indicator */}
        {isLastSeen && (
          <div className="absolute -top-1 -right-1 size-3 animate-pulse rounded-full bg-accent"></div>
        )}

        <div className="space-y-1">
          {/* Track title */}
          <div
            className="
              truncate leading-tight font-semibold text-text-primary transition-colors
              group-hover:text-accent
            "
          >
            {track.track.title}
          </div>

          {/* Artist name */}
          <div className="text-sm font-medium text-text-secondary">{track.source.artist?.name}</div>

          {/* Venue and date info */}
          <div className="space-y-1 text-xs text-foreground-muted">
            <VenueInfo track={track} />
          </div>

          {/* Footer with app type and time */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted capitalize">{app_type_description}</span>
            <span className="text-xs text-foreground-muted">
              <TimeAgo date={created_at} formatter={formatterFn} />
            </span>
          </div>
        </div>

        {/* Hover arrow */}
        <ArrowRight
          className="
            absolute top-4 right-4 text-foreground-muted opacity-0 transition-opacity duration-200
            group-hover:opacity-100
          "
          size={16}
        />
      </motion.div>
    </Link>
  );
}
