import React from 'react';
import Flex from './Flex';

type RowHeaderProps = {
  height?: number;
  children?: React.ReactNode;
  /** 'panel': a detail page's box, styled like its tables' group rows. */
  variant?: 'column' | 'panel';
};

const RowHeader = ({ height, children, variant = 'column' }: RowHeaderProps) => (
  <Flex
    className={
      variant === 'panel'
        ? `
          min-h-9 items-center justify-between border-b border-hairline bg-text-primary/[0.04]
          px-3 text-[11px] font-semibold tracking-wide text-column-subheader-text uppercase
        `
        : `
          min-h-[36px] items-center justify-between border-b border-hairline bg-column-subheader
          px-3 text-xs font-semibold tracking-wide text-column-subheader-text uppercase
          lg:min-h-[28px] lg:px-2 lg:text-[11px]
        `
    }
    style={{ minHeight: !children ? 16 : height }}
  >
    {children}
  </Flex>
);

export default RowHeader;
