'use client';

import { format, getDate, getMonth, parse } from 'date-fns';
import { Calendar } from 'lucide-react';
import { parseAsString, useQueryStates } from 'nuqs';

export default function DateJumper({ month, day }: { month: string; day: string }) {
  const [, setParams] = useQueryStates(
    {
      month: parseAsString.withDefault(month),
      day: parseAsString.withDefault(day),
    },
    { shallow: false }
  );

  // Use 2024 as reference year (leap year) so Feb 29 works
  const date = parse(`2024-${month}-${day}`, 'yyyy-M-d', new Date());
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
          setParams({
            month: String(getMonth(selected) + 1),
            day: String(getDate(selected)),
          });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
