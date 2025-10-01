import React from 'react';
import Flex from './Flex';

type RowHeaderProps = {
  height?: number;
  children?: React.ReactNode;
};

const RowHeader = ({ height, children }: RowHeaderProps) => (
  <Flex
    className="min-h-[28px] items-center justify-between border-b border-border-light bg-background-muted px-2 text-xs font-medium text-foreground-muted"
    style={{ minHeight: !children ? 16 : height }}
  >
    {children}
  </Flex>
);

export default RowHeader;
