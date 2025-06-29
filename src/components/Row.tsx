'use client';

import cn from '@/lib/cn';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import React, { MouseEvent, useTransition } from 'react';
import Flex from './Flex';
import RowLoading from './RowLoading';
import Spinner from './Spinner';

type RowProps = {
  children?: React.ReactNode;
  href?: string;
  active?: boolean;
  loading?: boolean;
  activeSegments?: Record<string, string | undefined>;
  isActiveOverride?: boolean;
};

const Row = ({ children, href, activeSegments, isActiveOverride, loading, ...props }: RowProps) => {
  const [isPending, startTransition] = useTransition();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  let isActive = isActiveOverride ?? false;

  // if every segment is true, then we're active
  if (isActiveOverride === undefined && activeSegments) {
    isActive = Object.entries(activeSegments).every(([key, value]) => params[key] === value);
  }

  if (!href) {
    return (
      <div className="content relative w-full flex-1 items-center justify-between py-1">
        {loading && <RowLoading />}
        {isActive && <div className="h-full w-2 bg-[#333333]" />}

        {children}
      </div>
    );
  }

  const onLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // dont block new tab
    if (e.metaKey) {
      return;
    }
    e.preventDefault();
    if (pathname === href) {
      startTransition(() => router.refresh());
      console.log('refreshing from row', pathname, href);
    } else {
      startTransition(() => router.push(href));
    }
  };

  return (
    <Link href={href ?? '/'} prefetch={false} onClick={onLinkClick} data-is-active={isActive}>
      <Flex
        className={cn('relisten-row relative min-h-[46px] items-stretch border-b border-gray-100', {
          'opacity-70': isPending,
        })}
        // style={{ minHeight: height }}
        {...props}
      >
        {loading && <RowLoading />}
        {isPending && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
            <Spinner />
          </div>
        )}
        {isPending && <div className="bg-relisten-600/30 w-2 animate-pulse" />}

        {!isPending && isActive && <div className="bg-relisten-600 w-2" />}
        <Flex className="w-full flex-1 items-center justify-between p-1 leading-tight">
          {children}
        </Flex>
      </Flex>
    </Link>
  );
};

export default Row;
