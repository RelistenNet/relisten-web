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
    <div>
      <div>
        {info.name} &middot; {info.location}
      </div>
      <div>{track.source.display_date}</div>
    </div>
  ) : null;
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
    <Link href={createURL(track)} prefetch={false}>
      <motion.div
        transition={{
          duration: 0.6,
          type: 'spring',
          borderColor: { duration: 2, type: 'ease-out' },
          layout: {
            duration: 1.2,
            type: 'ease-in-out',
          },
        }}
        initial={{ opacity: 1, height: 0, borderColor: 'rgba(0,255,50,0.1)' }}
        animate={{ opacity: 1, height: '100%', borderColor: 'rgba(0,0,0, 0.3)' }}
        className={`relative flex flex-1 cursor-pointer overflow-hidden rounded-sm border-[1px] px-4 py-2 transition-opacity duration-1000 ease-in-out hover:bg-slate-200/20 ${isLastSeen && 'border-b-green-600'}`}
        data-is-last-seen={isLastSeen}
        layout
      >
        <Flex className="flex-1" column>
          <Flex gap={1} className="items-center justify-between">
            <div className="content font-semibold">{track.track.title}</div>
            <span className="align-right text-nowrap text-xxs opacity-70">
              {app_type_description} &middot; <TimeAgo date={created_at} formatter={formatterFn} />
            </span>
          </Flex>
          <div className="text-sm">{track.source.artist?.name}</div>

          <div className="text-xxs text-foreground-muted">
            <VenueInfo
              track={track}
              app_type_description={app_type_description}
              created_at={created_at}
            />
          </div>
          <ArrowRight
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-900"
            size={16}
          />
        </Flex>
      </motion.div>
    </Link>
  );
}
