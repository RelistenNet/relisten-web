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

  return (
    <Link href={createURL(day)} prefetch={false}>
      <Flex className="group relative w-full cursor-pointer px-6 py-4 transition-colors duration-200 hover:bg-surface-hover">
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-transparent transition-colors duration-200 group-hover:bg-accent"></div>
        <div className="mr-6 w-28 flex-shrink-0">
          <div className="font-semibold text-accent">{day.display_date}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-text-primary">
            {day.venue?.name || 'Unknown Venue'}
          </div>
          {day.venue?.location && (
            <div className="truncate text-sm text-text-muted">{day.venue.location}</div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          →
        </div>
      </Flex>
    </Link>
  );
};
