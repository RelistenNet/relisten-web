'use client';

import { useRouter, usePathname } from 'next/navigation';
import { format, parse, getMonth, getDate } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function DateJumper({ month, day }: { month: string; day: string }) {
  const router = useRouter();
  const pathname = usePathname();

  // Use 2024 as reference year (leap year) so Feb 29 works
  const date = parse(`2024-${month}-${day}`, 'yyyy-M-d', new Date());
  const value = format(date, 'yyyy-MM-dd');

  return (
    <label className="relative cursor-pointer" title="Jump to date">
      <Calendar className="h-4 w-4 text-gray-500 hover:text-gray-700" />
      <input
        type="date"
        value={value}
        onChange={(e) => {
          const d = e.target.value;
          if (!d) return;
          const selected = parse(d, 'yyyy-MM-dd', new Date());
          router.replace(`${pathname}?month=${getMonth(selected) + 1}&day=${getDate(selected)}`);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
