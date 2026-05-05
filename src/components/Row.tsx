'use client';

import cn from '@/lib/cn';
import { Link, useLinkStatus } from '@timber-js/app/client';
import React from 'react';
import Flex from './Flex';
import RowLoading from './RowLoading';
import Spinner from './Spinner';

type RowProps = {
  children?: React.ReactNode;
  href?: string;
  active?: boolean;
  loading?: boolean;
};

export const unwrapSegment = (val: unknown): string | undefined => {
  if (Array.isArray(val)) return val[0];
  return val as string | undefined;
};

function RowLinkContent({
  children,
  isActive,
  loading,
  ...props
}: {
  children: React.ReactNode;
  isActive: boolean;
  loading?: boolean;
}) {
  const { isPending } = useLinkStatus();

  return (
    <Flex
      className={cn(
        'relative relisten-row min-h-[46px] items-stretch border-b border-hairline hover:bg-surface-hover',
        {
          'opacity-70': isPending,
          'bg-accent/10 hover:bg-accent/15': isActive && !isPending,
        }
      )}
      {...props}
    >
      {loading && <RowLoading />}
      {isPending && (
        <div className="absolute top-1/2 left-1/2 -translate-1/2 text-accent opacity-70">
          <Spinner />
        </div>
      )}
      {isPending && <div className="w-2 animate-pulse bg-relisten-600/30" />}

      {!isPending && isActive && <div className="w-2 min-w-2 bg-accent" />}
      <Flex className="w-full flex-1 items-center justify-between p-1 leading-tight tabular-nums">
        {children}
      </Flex>
    </Flex>
  );
}

const Row = ({ children, href, active = false, loading, ...props }: RowProps) => {
  if (!href) {
    return (
      <div className="relative content w-full flex-1 items-center justify-between py-1">
        {loading && <RowLoading />}
        {active && <div className="h-full w-2 bg-accent" />}

        {children}
      </div>
    );
  }

  return (
    <Link href={href} prefetch={false} data-is-active={active}>
      <RowLinkContent isActive={active} loading={loading} {...props}>
        {children}
      </RowLinkContent>
    </Link>
  );
};

export default React.memo(Row);
