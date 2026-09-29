import { Link } from '@timber-js/app/client';
import { splitShowDate } from '../lib/utils';
import { Day } from '../types';
import Flex from './Flex';

const createURL = (obj: Day): string => {
  const { year, month, day } = splitShowDate(obj.display_date);

  return '/' + [obj.artist?.slug, year, month, day].join('/');
};

export default ({ day }: { day: Day }) => {
  if (!day) return null;

  const { year } = splitShowDate(day.display_date);

  return (
    <Link href={createURL(day)} prefetch={false}>
      <Flex className="group w-full cursor-pointer items-center px-4 py-3 transition-colors duration-150 hover:bg-surface-hover">
        <div className="mr-4 w-12 flex-shrink-0 text-sm font-semibold text-accent">{year}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">
            {day.venue?.name || 'Unknown Venue'}
          </div>
          {day.venue?.location && (
            <div className="truncate text-xs text-text-muted">{day.venue.location}</div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 text-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          →
        </div>
      </Flex>
    </Link>
  );
};
