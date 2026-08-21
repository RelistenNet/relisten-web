'use client';

import cn from '@/lib/cn';
import { ArrowUp, ArrowDown } from 'lucide-react';
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
  subHeader?: React.ReactNode;
  scrollContainerRef?: React.Ref<HTMLDivElement>;
  height?: number;
};

const ColumnWithToggleControls = ({
  className,
  heading,
  children,
  toggles = [],
  filteredCount,
  totalCount,
  onClearFilters,
  subHeader,
  scrollContainerRef,
  height,
}: ColumnWithToggleControlsProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const hiddenRows =
    typeof totalCount === 'number' && typeof filteredCount === 'number'
      ? totalCount - filteredCount
      : 0;

  return (
    <Flex
      ref={ref}
      className={cn('relisten-column relative flex-1 break-words bg-surface', className)}
      column
    >
      <Scroller containerRef={ref} key={heading} />
      {heading && (
        <Flex className="bg-column-header min-h-[44px] w-full items-center justify-between border-b border-hairline px-3 text-base font-medium text-column-header-text capitalize lg:min-h-[32px] lg:px-2 lg:text-sm">
          <span className="flex-1 text-center">{heading?.replaceAll('-', ' ')}</span>

          <Flex className="absolute right-2 gap-1">
            {toggles.map((toggle, index) => (
              <button
                key={index}
                onClick={toggle.onToggle}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded p-1 transition-all duration-200',
                  'hover:scale-105 hover:bg-column-header-text/10 active:scale-95',
                  toggle.isActive
                    ? 'ring-accent/40 bg-column-header-text/20 font-medium text-column-header-text ring-1'
                    : 'bg-column-header-text/5 text-column-header-text/70 hover:text-column-header-text',
                  toggle.isActive && toggle.label
                    ? 'bg-emerald-500 text-white ring-emerald-300 hover:bg-emerald-500'
                    : '',
                  toggle.label && 'text-[10px]'
                )}
                title={toggle.title}
              >
                {toggle.icon ? (
                  toggle.icon
                ) : toggle.type === 'sort' ? (
                  toggle.isActive ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : !toggle.label ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : null
                ) : null}
                {toggle.label && <span>{toggle.label}</span>}
              </button>
            ))}
          </Flex>
        </Flex>
      )}
      {subHeader}
      <Flex ref={scrollContainerRef} column className="flex-1 overflow-x-hidden overflow-y-auto">
        {filteredCount !== undefined && totalCount !== undefined && filteredCount < totalCount && (
          <div className="m-2 rounded border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-700">
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
                {simplePluralize('row', hiddenRows)} {hiddenRows === 1 ? 'is' : 'are'} hidden by
                filters.{' '}
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
        <div style={{ minHeight: height }}>{children}</div>
      </Flex>
    </Flex>
  );
};

export default ColumnWithToggleControls;
