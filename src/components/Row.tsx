'use client';

import cn from '@/lib/cn';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  fallbackParams?: Record<string, string>;
  isActiveOverride?: boolean;
};

const unwrap = (val: Array<any> | any) => {
  if (Array.isArray(val)) return val[0];

  return val;
};

const Row = ({
  children,
  href,
  activeSegments,
  isActiveOverride,
  loading,
  fallbackParams,
  ...props
}: RowProps) => {
  const [isPending, startTransition] = useTransition();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  let isActive = isActiveOverride ?? false;

  if (isActiveOverride === undefined && activeSegments) {
    isActive = Object.entries(activeSegments).every(
      ([key, value]) => (unwrap(params[key]) ?? fallbackParams?.[key]) === value
    );
  }

  if (!href) {
    return (
      <div className="content relative w-full flex-1 items-center justify-between py-1">
        {loading && <RowLoading />}
        {isActive && <div className="bg-foreground h-full w-2" />}

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

    const fullPath = [pathname, searchParams].filter((x) => x).join('?');

    if (fullPath === href) {
      startTransition(() => router.refresh());
      console.log('refreshing from row', pathname, href);
    } else {
      startTransition(() => router.push(href));
    }
  };

  return (
    <Link href={href ?? '/'} prefetch={false} onClick={onLinkClick} data-is-active={isActive}>
      <Flex
        className={cn('relisten-row relative min-h-[46px] items-stretch border-b border-border-light', {
          'opacity-70': isPending,
        })}
        // style={{ minHeight: height }}
        {...props}
      >
        {loading && <RowLoading />}
        {isPending && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
            <Spinner />
          </div>
        )}
        {isPending && <div className="bg-relisten-600/30 w-2 animate-pulse" />}

        {!isPending && isActive && <div className="bg-relisten-600 w-2 min-w-2" />}
        <Flex className="w-full flex-1 items-center justify-between p-1 leading-tight">
          {children}
        </Flex>
      </Flex>
    </Link>
  );
};

export default Row;
