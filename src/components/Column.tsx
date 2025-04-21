'use client';

import cn from '@/lib/cn';
import React, { useRef } from 'react';
import Flex from './Flex';
import Row from './Row';
import Scroller from './Scroller';

type ColumnProps = {
  loading?: boolean;
  loadingAmount?: number;
  heading?: string;
  children?: React.ReactNode;
  className?: string;
};

const Column = ({ className, heading, loading, loadingAmount, children }: ColumnProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   // TODO: refactor this to not use raw query calls
  //   Array.prototype.forEach.call(document.querySelectorAll('.column .active'), (activeRow) => {
  //     activeRow.scrollIntoView({
  //       block: 'center',
  //     });
  //   });
  // }, []);

  return (
    <Flex ref={ref} className={cn('relisten-column flex-1 break-words', className)} column>
      <Scroller containerRef={ref} key={heading} />
      {heading && (
        <Flex center className="bg-relisten-600 min-h-[32px] w-full text-white capitalize">
          {heading?.replaceAll('-', ' ')}
        </Flex>
      )}
      <Flex column className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading
          ? new Array(loadingAmount).fill(null).map((i, idx) => <Row key={idx} loading />)
          : children}
      </Flex>
    </Flex>
  );
};

export default Column;
