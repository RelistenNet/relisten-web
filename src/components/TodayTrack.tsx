import Link from 'next/link';
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
      <Flex className="group relative w-full cursor-pointer px-6 py-4 transition-colors duration-200 hover:bg-black/5">
        <div className="group-hover:bg-relisten-400/20 absolute top-0 bottom-0 left-0 w-1 bg-transparent transition-colors duration-200"></div>
        <div className="mr-6 w-28 flex-shrink-0">
          <div className="text-relisten-700 font-semibold">{day.display_date}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-gray-900">
            {day.venue?.name || 'Unknown Venue'}
          </div>
          {day.venue?.location && (
            <div className="text-foreground-muted truncate text-sm">{day.venue.location}</div>
          )}
        </div>
        <div className="text-relisten-600 ml-4 flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          →
        </div>
      </Flex>
    </Link>
  );
};
