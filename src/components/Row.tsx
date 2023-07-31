import React from 'react';
import Link from 'next/link';
import RowLoading from './RowLoading';
import Flex from './Flex';

type RowProps = {
  height?: number;
  children?: React.ReactNode;
  href?: string;
  baseHrefOverride?: string;
  active?: boolean;
  loading?: boolean;
};

const Row = ({ height, children, href, active, loading, baseHrefOverride, ...props }: RowProps) => (
  <Flex
    column
    className="relisten-row min-h-[46px] items-center border-b-[#f1f1f1]"
    style={{ minHeight: height }}
    {...props}
  >
    {loading && <RowLoading />}
    {href || baseHrefOverride ? (
      <Link href={baseHrefOverride ? baseHrefOverride : '/'} as={href} legacyBehavior>
        <Flex
          as={'a'}
          className={`${
            active
              ? 'content-none after:absolute after:left-0 after:top-0 after:h-full after:w-[8px] after:bg-[#333333]'
              : ''
          } content relative w-full flex-1 items-center justify-between p-[4px]`}
        >
          {children}
        </Flex>
      </Link>
    ) : children ? (
      <div
        className={`content relative w-full flex-1 items-center justify-between py-1 ${
          active
            ? 'content-none after:absolute after:left-0 after:top-0 after:h-full after:w-[8px] after:bg-[#333333]'
            : ''
        }`}
      >
        {children}
      </div>
    ) : null}
  </Flex>
);

export default Row;
