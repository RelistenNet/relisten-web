import React from 'react';
import Flex from './Flex';

type RowHeaderProps = {
  height?: number;
  children?: React.ReactNode;
};

const RowHeader = ({ height, children }: RowHeaderProps) => (
  <Flex
    className="min-h-[28px] items-center justify-between border-b border-gray-200/50 bg-gray-100/80 px-3 text-xs font-medium text-gray-600"
    style={{ minHeight: !children ? 16 : height }}
  >
    {children}
  </Flex>
);

export default RowHeader;
