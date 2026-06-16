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
      className={cn('relisten-column flex-1 break-words bg-surface', className)}
      column
    >
      <Scroller containerRef={ref} key={heading} />
      {heading?.trim() && (
        <Flex
          center
          className="bg-column-header min-h-[32px] w-full border-b border-hairline text-sm font-medium text-column-header-text capitalize"
        >
          {heading?.replaceAll('-', ' ')}
        </Flex>
      )}
      <Flex column className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </Flex>
    </Flex>
  );
};

export default Column;
