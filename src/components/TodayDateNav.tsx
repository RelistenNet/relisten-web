'use client';

import { Link } from '@timber-js/app/client';
import { format, addDays, subDays, parse, getMonth, getDate } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DateJumper from './DateJumper';

type TodayDateNavProps = {
  month: string;
  day: string;
  pathname: string;
};

function buildDateUrl(pathname: string, date: Date) {
  return `${pathname}?month=${getMonth(date) + 1}&day=${getDate(date)}`;
}

export default function TodayDateNav({ month, day, pathname }: TodayDateNavProps) {
  // Use 2024 as reference year (leap year) so Feb 29 works
  const date = parse(`2024-${month}-${day}`, 'yyyy-M-d', new Date());
  const prev = subDays(date, 1);
  const next = addDays(date, 1);

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href={buildDateUrl(pathname, prev)}
        className="
          rounded-sm p-0.5 text-text-muted
          hover:bg-surface-hover hover:text-text-primary
        "
        title="Previous day"
      >
        <ChevronLeft className="size-4" />
      </Link>

      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-text-secondary">{format(date, 'MMMM do')}</span>
        <DateJumper month={month} day={day} />
      </div>

      <Link
        href={buildDateUrl(pathname, next)}
        className="
          rounded-sm p-0.5 text-text-muted
          hover:bg-surface-hover hover:text-text-primary
        "
        title="Next day"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
