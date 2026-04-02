'use client';

import cn from '@/lib/cn';
import { Link, useLinkStatus, useSegmentParams } from '@timber-js/app/client';
import React from 'react';
import Flex from './Flex';
import RowLoading from './RowLoading';
import Spinner from './Spinner';

type RowProps = {
  children?: React.ReactNode;
  href?: string;
  active?: boolean;
  loading?: boolean;
  activeSegments?: Record<string, string | undefined>;
  fallbackParams?: Record<string, string>;
  isActiveOverride?: boolean;
};

const unwrap = (val: Array<any> | any) => {
  if (Array.isArray(val)) return val[0];

  return val;
};

/**
 * Inner content of a Row when it has an href.
 * Separated so useLinkStatus() can read from the parent <Link>'s context.
 */
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
      className={cn('relative relisten-row min-h-[46px] items-stretch border-b border-gray-100', {
        'opacity-70': isPending,
      })}
      {...props}
    >
      {loading && <RowLoading />}
      {isPending && (
        <div className="absolute top-1/2 left-1/2 -translate-1/2 opacity-40">
          <Spinner />
        </div>
      )}
      {isPending && <div className="w-2 animate-pulse bg-relisten-600/30" />}

      {!isPending && isActive && <div className="w-2 min-w-2 bg-relisten-600" />}
      <Flex className="w-full flex-1 items-center justify-between p-1 leading-tight tabular-nums">
        {children}
      </Flex>
    </Flex>
  );
}

const Row = ({
  children,
  href,
  activeSegments,
  isActiveOverride,
  loading,
  fallbackParams,
  ...props
}: RowProps) => {
  const params = useSegmentParams();
  let isActive = isActiveOverride ?? false;

  if (isActiveOverride === undefined && activeSegments) {
    isActive = Object.entries(activeSegments).every(
      ([key, value]) => (unwrap(params[key]) ?? fallbackParams?.[key]) === value
    );
  }

  if (!href) {
    return (
      <div className="relative content w-full flex-1 items-center justify-between py-1">
        {loading && <RowLoading />}
        {isActive && <div className="h-full w-2 bg-foreground" />}

        {children}
      </div>
    );
  }

  return (
    <Link href={href} prefetch={false} data-is-active={isActive}>
      <RowLinkContent isActive={isActive} loading={loading} {...props}>
        {children}
      </RowLinkContent>
    </Link>
  );
};

export default Row;
