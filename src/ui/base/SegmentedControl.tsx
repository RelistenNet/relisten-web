'use client';

import { useId } from 'react';
import cn from '@/lib/cn';

/** A row of mutually exclusive options (a radio group styled as joined buttons). */
export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-text-secondary">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid auto-cols-fr grid-flow-col rounded-md border border-hairline bg-surface-recessed p-0.5"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'cursor-pointer rounded-sm px-2 py-1 text-sm transition-colors',
                active
                  ? 'bg-surface-raised text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
