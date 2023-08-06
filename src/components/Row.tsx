'use client';

import React from 'react';
import Link from 'next/link';
import RowLoading from './RowLoading';
import Flex from './Flex';
import { usePathname, useRouter, useSelectedLayoutSegments } from 'next/navigation';

type RowProps = {
  height?: number;
  children?: React.ReactNode;
  href?: string;
  active?: boolean;
  loading?: boolean;
  activeSegments?: Record<string, string | undefined>;
  isActiveOverride?: boolean;
};

const Row = ({
  height,
  children,
  href,
  activeSegments,
  isActiveOverride,
  loading,
  ...props
}: RowProps) => {
  const segments = useSelectedLayoutSegments();
  const pathname = usePathname();
  const router = useRouter();

  let isActive = isActiveOverride ?? false;

  // if every segment is true, then we're active
  if (isActiveOverride === undefined && activeSegments) {
    isActive = Object.entries(activeSegments).every(([key, value]) => segments[key] === value);
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

  const onLinkClick = () => {
    if (pathname === href) {
      router.refresh();
      console.log('refreshing from row', pathname, href);
    }
  };

  return (
    <Link href={href ?? '/'} prefetch={false} onClick={onLinkClick}>
      <Flex
        className="relisten-row min-h-[46px] items-stretch border-b-[#f1f1f1]"
        // style={{ minHeight: height }}
        {...props}
      >
        {loading && <RowLoading />}
        {isActive && <div className="w-2 bg-[#333333]" />}
        <Flex className={'w-full flex-1 items-center justify-between p-1'}>{children}</Flex>
      </Flex>
    </Link>
  );
};

export default Row;
