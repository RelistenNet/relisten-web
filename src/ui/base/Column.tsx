'use client';

import cn from '@/lib/cn';
import React, { useRef } from 'react';
import Flex from './Flex';
import Scroller from './Scroller';

type ColumnProps = {
  /** See columnHeading. */
  heading?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/** A string heading has its dashes shown as spaces; a node (e.g. with links) is shown as-is. */
export const columnHeading = (heading: React.ReactNode) =>
  typeof heading === 'string' ? heading.trim().replaceAll('-', ' ') : heading;

const Column = ({ className, heading, children }: ColumnProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // useEffect(() => {
  //   // TODO: refactor this to not use raw query calls
  //   Array.prototype.forEach.call(document.querySelectorAll('.column .active'), (activeRow) => {
  //     activeRow.scrollIntoView({
  //       block: 'center',
  //     });
  //   });
  // }, []);

  return (
    <Flex
      ref={ref}
      className={cn('relisten-column flex-1 bg-surface break-words', className)}
      column
    >
      <Scroller containerRef={ref} />
      {columnHeading(heading) && (
        <Flex
          center
          className="
            min-h-[32px] w-full border-b border-hairline bg-column-header text-sm font-medium
            text-column-header-text capitalize max-lg:hidden
          "
        >
          {columnHeading(heading)}
        </Flex>
      )}
      <Flex column className="flex-1 overflow-x-hidden lg:overflow-y-auto">
        {children}
      </Flex>
    </Flex>
  );
};

export default Column;
