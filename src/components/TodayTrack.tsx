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
      <Flex className="group w-full cursor-pointer hover:bg-relisten-50 transition-colors duration-200 py-4 px-6 relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-relisten-400/20 transition-colors duration-200"></div>
        <div className="w-28 flex-shrink-0 mr-6">
          <div className="font-semibold text-relisten-700">{day.display_date}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-gray-900 font-medium truncate">
            {day.venue?.name || 'Unknown Venue'}
          </div>
          {day.venue?.location && (
            <div className="text-sm text-foreground-muted truncate">{day.venue.location}</div>
          )}
        </div>
        <div className="flex-shrink-0 ml-4 text-relisten-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          →
        </div>
      </Flex>
    </Link>
  );
};
