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
        'relative relisten-row min-h-[56px] items-stretch border-b border-hairline hover:bg-surface-hover lg:min-h-[46px]',
        {
          'opacity-70': isPending,
          'bg-accent/10 hover:bg-accent/15': isActive && !isPending,
        }
      )}
      {...props}
    >
      {loading && <RowLoading />}
      {isPending && (
        <div className="absolute top-1/2 left-1/2 -translate-1/2 text-white/80 opacity-70">
          {/* <Spinner /> */}
        </div>
      )}
      {isPending && <div className="w-2 animate-pulse bg-relisten-600/30" />}

      {!isPending && isActive && <div className="w-2 min-w-2 bg-accent" />}
      <Flex className="w-full flex-1 items-center justify-between p-2 leading-tight tabular-nums lg:p-1">
        {children}
      </Flex>
    </Flex>
  );
}

const Row = ({ children, href, active = false, loading, ...props }: RowProps) => {
  if (!href) {
    return (
      <Flex
        className={cn(
          'relisten-row relative min-h-[56px] items-stretch border-b border-hairline hover:bg-surface-hover lg:min-h-[46px]',
          { 'bg-accent/10 hover:bg-accent/15': active }
        )}
      >
        {loading && <RowLoading />}
        {active && <div className="w-2 min-w-2 bg-accent" />}
        <Flex className="w-full flex-1 items-center justify-between p-2 leading-tight tabular-nums lg:p-1">
          {children}
        </Flex>
      </Flex>
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
