import React from 'react';
import Flex from './Flex';

type RowHeaderProps = {
  height?: number;
  children?: React.ReactNode;
};

const RowHeader = ({ height, children }: RowHeaderProps) => (
  <Flex
    className="min-h-[28px] items-center justify-between border-b border-hairline bg-surface-hover px-2 text-[11px] font-semibold tracking-wide text-text-secondary uppercase"
    style={{ minHeight: !children ? 16 : height }}
  >
    {children}
  </Flex>
);

export default RowHeader;
