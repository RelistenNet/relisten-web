import Link from 'next/link';
import { splitShowDate } from '../lib/utils';
import { Day } from '../types';
import Flex from './Flex';

const createURL = (obj: Day): string => {
  const { year, month, day } = splitShowDate(obj.display_date);

  return '/' + [obj.artist.slug, year, month, day].join('/');
};

// eslint-disable-next-line react/display-name
export default ({ day }: { day: Day }): JSX.Element => {
  return !day ? null : (
    <Link href="/" as={createURL(day)} legacyBehavior>
      <Flex className="w-full cursor-pointer border-b-2 border-b-[#eee] p-3">
        <div className="mr-3">
          <div className="font-bold">{day.display_date}</div>
        </div>

        <div>
          <div>{day.venue ? [day.venue.name, day.venue.location].join(' ') : ''}</div>
        </div>

        <div className="ml-auto self-center">Listen</div>
      </Flex>
    </Link>
  );
};
