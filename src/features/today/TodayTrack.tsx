import { Link } from '@timber-js/app/client';
import type { Artist, ShowSummary } from '@/domain/types';
import { splitShowDate } from '@/lib/utils';
import Flex from '@/ui/base/Flex';

/** A show on the Today page, with its artist (undefined when the directory doesn't know it). */
export type TodayShow = ShowSummary & { artist?: Pick<Artist, 'name' | 'slug'> };

const createURL = (show: TodayShow): string => {
  const { year, month, day } = splitShowDate(show.date);

  return '/' + [show.artist?.slug, year, month, day].join('/');
};

export default ({ show }: { show: TodayShow }) => {
  if (!show) return null;

  const { year } = splitShowDate(show.date);

  return (
    <Link href={createURL(show)} prefetch={false}>
      <Flex
        className="
        group w-full cursor-pointer items-center px-4 py-3 transition-colors duration-150
        hover:bg-surface-hover
      "
      >
        <div className="mr-4 w-12 flex-shrink-0 text-sm font-semibold text-accent">{year}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">
            {show.venue?.name || 'Unknown Venue'}
          </div>
          {show.venue?.location && (
            <div className="truncate text-xs text-text-muted">{show.venue.location}</div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 text-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          →
        </div>
      </Flex>
    </Link>
  );
};
