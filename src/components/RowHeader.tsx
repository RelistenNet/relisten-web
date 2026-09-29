import React from 'react';
import Flex from './Flex';

type RowHeaderProps = {
  height?: number;
  children?: React.ReactNode;
};

const RowHeader = ({ height, children }: RowHeaderProps) => (
  <Flex
    className="min-h-[36px] items-center justify-between border-b border-hairline bg-column-subheader px-3 text-xs font-semibold tracking-wide text-column-subheader-text uppercase lg:min-h-[28px] lg:px-2 lg:text-[11px]"
    style={{ minHeight: !children ? 16 : height }}
  >
    {children}
  </Flex>
);

export default RowHeader;
