'use client';

import cn from '@/lib/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';
import React, { useRef } from 'react';
import Flex from './Flex';
import Scroller from './Scroller';
import { simplePluralize } from '@/lib/utils';

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

  const hiddenRows =
    typeof totalCount === 'number' && typeof filteredCount === 'number'
      ? totalCount - filteredCount
      : 0;

  return (
    <Flex ref={ref} className={cn('relisten-column relative flex-1 break-words', className)} column>
      <Scroller containerRef={ref} key={heading} />
      {heading && (
        <Flex className="bg-relisten-700/80 min-h-[32px] w-full items-center justify-between px-2 text-white capitalize">
          <span className="flex-1 text-center">{heading?.replaceAll('-', ' ')}</span>

          <Flex className="absolute right-2 gap-1">
            {toggles.map((toggle, index) => (
              <button
                key={index}
                onClick={toggle.onToggle}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded p-1 transition-all duration-200',
                  'hover:scale-105 hover:bg-white/10 active:scale-95',
                  toggle.isActive
                    ? 'ring-relisten-300/80 bg-white/25 font-medium text-white ring-1'
                    : 'bg-white/5 text-white/80 hover:text-white',
                  toggle.isActive && toggle.label
                    ? 'bg-emerald-500 ring-emerald-300 hover:bg-emerald-500'
                    : '',
                  toggle.label && 'text-[10px]'
                )}
                title={toggle.title}
              >
                {toggle.icon ? (
                  toggle.icon
                ) : toggle.type === 'sort' ? (
                  toggle.isActive ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )
                ) : null}
                {toggle.label && <span>{toggle.label}</span>}
              </button>
            ))}
          </Flex>
        </Flex>
      )}
      <Flex column className="flex-1 overflow-x-hidden overflow-y-auto">
        {filteredCount !== undefined && totalCount !== undefined && filteredCount < totalCount && (
          <div className="m-2 rounded border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400">
            {filteredCount === 0 ? (
              <>
                All {simplePluralize('row', hiddenRows)} are hidden by filters.{' '}
                <button
                  onClick={onClearFilters}
                  className="font-medium underline hover:no-underline"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                {simplePluralize('row', hiddenRows)} {hiddenRows === 1 ? 'is' : 'are'} hidden by filters.{' '}
                <button
                  onClick={onClearFilters}
                  className="font-medium underline hover:no-underline"
                >
                  Clear Filters
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
