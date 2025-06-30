import { motion } from 'framer-motion';
import Link from 'next/link';
import TimeAgo from 'react-timeago';

import { ArrowRight } from 'lucide-react';
import { splitShowDate } from '../lib/utils';
import { Track, TrackSource, Venue } from '../types';
import Flex from './Flex';

const createURL = (track: { track: Track; source: TrackSource }): string => {
  const { year, month, day } = splitShowDate(track.source.display_date);

  return (
    '/' +
    [track.source.artist?.slug, year, month, day, track.track.slug].join('/') +
    `?source=${track.source.id}`
  );
};

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
  app_type_description: string;
  created_at: string;
};

const VenueInfo = ({ track, app_type_description, created_at }: VenueInfoProps) => {
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

type LiveTrackProps = {
  app_type_description: string;
  created_at: string;
  track: {
    source: TrackSource;
    track: Track;
  };
  isFirstRender: boolean;
  isLastSeen: boolean;
};

export default function LiveTrack({
  app_type_description = '',
  created_at,
  track,
  isFirstRender,
  isLastSeen,
}: LiveTrackProps) {
  if (!track?.track) return null;

  return (
    <Link href={createURL(track)} prefetch={false} className="group h-full">
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300,
        }}
        className={`relative h-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-lg ${
          isLastSeen ? 'border-green-200 ring-2 ring-green-100' : ''
        }`}
        data-is-last-seen={isLastSeen}
      >
        {/* New track indicator */}
        {isLastSeen && (
          <div className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
        )}

        <div className="space-y-1">
          {/* Track title */}
          <div className="truncate leading-tight font-semibold text-gray-900 transition-colors group-hover:text-gray-700">
            {track.track.title}
          </div>

          {/* Artist name */}
          <div className="text-sm font-medium text-gray-700">{track.source.artist?.name}</div>

          {/* Venue and date info */}
          <div className="text-foreground-muted space-y-1 text-xs">
            <VenueInfo
              track={track}
              app_type_description={app_type_description}
              created_at={created_at}
            />
          </div>

          {/* Footer with app type and time */}
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted text-xs capitalize">{app_type_description}</span>
            <span className="text-foreground-muted text-xs">
              <TimeAgo date={created_at} formatter={formatterFn} />
            </span>
          </div>
        </div>

        {/* Hover arrow */}
        <ArrowRight
          className="text-foreground-muted absolute top-4 right-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          size={16}
        />
      </motion.div>
    </Link>
  );
}
