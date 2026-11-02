'use client';

import cn from '@/lib/cn';
import React, { useRef } from 'react';
import Flex from './Flex';
import Scroller from './Scroller';

type ColumnProps = {
  heading?: string;
  children?: React.ReactNode;
  className?: string;
};

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
      {heading?.trim() && (
        <Flex
          center
          className="min-h-[32px] w-full border-b border-hairline bg-column-header text-sm font-medium text-column-header-text capitalize max-lg:hidden"
        >
          {heading?.replaceAll('-', ' ')}
        </Flex>
      )}
      <Flex column className="flex-1 overflow-x-hidden lg:overflow-y-auto">
        {children}
      </Flex>
    </Flex>
  );
};

export default Column;
