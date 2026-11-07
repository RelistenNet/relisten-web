'use client';

import { format, getDate, getMonth, parse } from 'date-fns';
import { Calendar } from 'lucide-react';
import { dateSearchParams } from '@/lib/searchParams/dateSearchParam';

export default function DateJumper({ month, day }: { month: string; day: string }) {
  const [, setParams] = dateSearchParams.useQueryStates({ shallow: false });

  // Use 2024 as reference year (leap year) so Feb 29 works
  const date = new Date(2024, Number(month) - 1, Number(day));
  const value = format(date, 'yyyy-MM-dd');

  return (
    <label className="relative cursor-pointer" title="Jump to date">
      <Calendar
        className="
          size-4 text-text-muted
          hover:text-text-primary
        "
      />
      <input
        type="date"
        value={value}
        onChange={(e) => {
          const d = e.target.value;
          if (!d) return;
          const selected = parse(d, 'yyyy-MM-dd', new Date());
          setParams({ month: getMonth(selected) + 1, day: getDate(selected) });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
