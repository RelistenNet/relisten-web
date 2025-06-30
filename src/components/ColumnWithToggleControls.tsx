'use client';

import cn from '@/lib/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';
import React, { useRef } from 'react';
import Flex from './Flex';
import Scroller from './Scroller';

type ToggleConfig = {
  type: 'sort' | 'filter';
  isActive: boolean;
  onToggle: () => void;
  title: string;
  icon?: React.ReactNode;
  label?: string;
};

type ColumnWithToggleControlsProps = {
  heading?: string;
  children?: React.ReactNode;
  className?: string;
  toggles?: ToggleConfig[];
  filteredCount?: number;
  totalCount?: number;
  onClearFilters?: () => void;
};

const ColumnWithToggleControls = ({
  className,
  heading,
  children,
  toggles = [],
  filteredCount,
  totalCount,
  onClearFilters,
}: ColumnWithToggleControlsProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <Flex ref={ref} className={cn('relisten-column flex-1 break-words relative', className)} column>
      <Scroller containerRef={ref} key={heading} />
      {heading && (
        <Flex className="bg-relisten-600 min-h-[32px] w-full text-white capitalize px-2 items-center justify-between">
          <span className="flex-1 text-center">{heading?.replaceAll('-', ' ')}</span>

          <Flex className="gap-1 absolute right-2">
            {toggles.map((toggle, index) => (
              <button
                key={index}
                onClick={toggle.onToggle}
                className={cn(
                  'p-1 rounded transition-all duration-200 flex items-center gap-1 cursor-pointer',
                  'hover:bg-white/10 hover:scale-105 active:scale-95',
                  toggle.isActive
                    ? 'bg-white/25 text-white shadow-md ring-1 ring-relisten-200 font-medium'
                    : 'bg-white/5 text-white/80 hover:text-white',
                  toggle.label && 'text-[10px]'
                )}
                title={toggle.title}
              >
                {toggle.icon ? (
                  toggle.icon
                ) : toggle.type === 'sort' ? (
                  toggle.isActive ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )
                ) : null}
                {toggle.label && <span>{toggle.label}</span>}
              </button>
            ))}
          </Flex>
        </Flex>
      )}
      <Flex column className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredCount !== undefined && totalCount !== undefined && filteredCount < totalCount && (
          <div className="p-2 m-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-700 text-xs">
            {filteredCount === 0 ? (
              <>
                All {totalCount - filteredCount} rows are hidden by filters.{' '}
                <button
                  onClick={onClearFilters}
                  className="underline hover:no-underline font-medium"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                {totalCount - filteredCount} rows are hidden by filters.{' '}
                <button
                  onClick={onClearFilters}
                  className="underline hover:no-underline font-medium"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        )}
        {children}
      </Flex>
    </Flex>
  );
};

export default ColumnWithToggleControls;
