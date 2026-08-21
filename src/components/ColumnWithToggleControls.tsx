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
  isDefault?: boolean;
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
                  'hover:scale-105 active:scale-95',
                  toggle.isActive && !toggle.isDefault
                    ? toggle.type === 'filter'
                      ? 'ring-1 ring-emerald-400/40 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                      : 'ring-1 ring-accent/40 bg-accent/10 font-medium text-accent hover:bg-accent/15'
                    : 'bg-column-header-text/5 text-column-header-text/70 hover:bg-column-header-text/10 hover:text-column-header-text',
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
          <div className="mx-2 my-2 flex items-center justify-between rounded bg-accent/10 px-3 py-1.5 text-xs text-accent">
            <span>
              {filteredCount === 0
                ? `All ${simplePluralize('row', hiddenRows)} hidden`
                : `${simplePluralize('row', hiddenRows)} hidden`}
            </span>
            <button
              onClick={onClearFilters}
              className="cursor-pointer rounded px-1.5 py-0.5 font-medium hover:bg-accent/15"
            >
              Clear
            </button>
          </div>
        )}
        <div style={{ minHeight: height }}>{children}</div>
      </Flex>
    </Flex>
  );
};

export default ColumnWithToggleControls;
