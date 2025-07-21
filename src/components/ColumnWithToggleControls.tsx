'use client';

import cn from '@/lib/cn';
import { simplePluralize } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useRef, useState, useEffect } from 'react';
import Flex from './Flex';
import Scroller from './Scroller';

interface SearchToggleProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

const SearchToggle = ({ searchTerm, onSearch, onExpandedChange }: SearchToggleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    console.log(isExpanded);
    setIsExpanded((expanded) => !expanded);
    onExpandedChange?.(!isExpanded);

    if (!isExpanded && searchTerm) {
      onSearch('');
    }
  };

  const handleEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onSearch('');
      setIsExpanded(false);
      onExpandedChange?.(false);
    }
  };

  const handleBlur = () => {
    // Close the search if it's empty on blur
    if (!searchTerm.trim()) {
      setIsExpanded(false);
      onExpandedChange?.(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isExpanded &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        onExpandedChange?.(false);
        if (searchTerm) {
          onSearch('');
        }
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded, searchTerm, onSearch, onExpandedChange]);

  return (
    <AnimatePresence>
      {isExpanded ? (
        <motion.div
          ref={containerRef}
          key="search-expanded"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="bg-relisten-700/80 flex items-center rounded-sm pl-2"
        >
          <motion.div
            className="flex w-full items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            <Search className="h-3 w-3 text-white/60" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={handleEscape}
              onBlur={handleBlur}
              placeholder="Search..."
              className="flex-1 bg-transparent px-1 text-sm text-white placeholder-white/60 focus:outline-none"
              autoFocus
            />
            <motion.button
              onClick={handleToggle}
              className="flex cursor-pointer items-center gap-1 rounded p-1 text-white/80 transition-all duration-200 hover:text-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Close search"
            >
              <X className="h-3 w-3" />
            </motion.button>
          </motion.div>
        </motion.div>
      ) : null}
      <motion.button
        key="search-collapsed"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        transition={{ duration: 0.15 }}
        onClick={handleToggle}
        className="flex cursor-pointer items-center gap-1 rounded p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Search"
      >
        <Search className="h-3 w-3" />
      </motion.button>
    </AnimatePresence>
  );
};

const DisplayToggleButton = ({ title, path }: { title: string; path: string }) => {
  const pathname = usePathname();

  // Check if this is the active path, or if it's Years and no venue path is active
  const isActive = pathname === path || (title === 'Years' && !pathname?.includes('/venues'));

  return (
    <Link
      href={path}
      prefetch={false}
      className={cn(
        'my-1 cursor-pointer rounded-md px-1 text-xs hover:scale-105',
        isActive ? 'bg-relisten-600 font-semibold text-white' : ''
      )}
    >
      <button className={cn('mx-1 cursor-pointer')}>{title}</button>
    </Link>
  );
};

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
  showDisplayToggle?: boolean;
  artistSlug?: string;
  searchTerm?: string;
  onSearch?: (term: string) => void;
  showSearch?: boolean;
};

const ColumnWithToggleControls = ({
  className,
  heading,
  children,
  toggles = [],
  filteredCount,
  totalCount,
  onClearFilters,
  showDisplayToggle = false,
  artistSlug = '',
  searchTerm = '',
  onSearch,
  showSearch = false,
}: ColumnWithToggleControlsProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const hiddenRows =
    typeof totalCount === 'number' && typeof filteredCount === 'number'
      ? totalCount - filteredCount
      : 0;

  return (
    <Flex ref={ref} className={cn('relisten-column relative flex-1 break-words', className)} column>
      <Scroller containerRef={ref} key={heading} />
      {heading && (
        <>
          <Flex className="bg-relisten-700/80 relative min-h-[32px] w-full items-center justify-between px-2 text-white capitalize">
            {!isSearchExpanded && (
              <span className="flex-1 text-center">{heading?.replaceAll('-', ' ')}</span>
            )}

            <Flex className="absolute right-2 gap-1">
              {showSearch && onSearch && (
                <SearchToggle
                  searchTerm={searchTerm}
                  onSearch={onSearch}
                  onExpandedChange={setIsSearchExpanded}
                />
              )}
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
        </>
      )}
      <Flex column className="flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none">
        {showDisplayToggle && (
          <Flex className="border-relisten-600 mx-auto w-11/12 justify-center gap-1 rounded-b border-1 border-t-0 bg-gray-200 px-1">
            <DisplayToggleButton title="Years" path={`/${artistSlug}`} />
            <DisplayToggleButton title="Venues" path={`/${artistSlug}/venues`} />
            <DisplayToggleButton title="Songs" path={`/${artistSlug}/venues`} />
          </Flex>
        )}
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
                {simplePluralize('row', hiddenRows)} are hidden by filters.{' '}
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
