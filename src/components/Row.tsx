'use client';

import cn from '@/lib/cn';
import {
  Link,
  useLinkStatus,
  usePathname,
  usePendingNavigation,
  useRouter,
} from '@timber-js/app/client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Flex from './Flex';
import RowLoading from './RowLoading';

type RowProps = {
  children?: React.ReactNode;
  href?: string;
  active?: boolean;
  loading?: boolean;
  /**
   * Clicking the row while already on `href` re-fetches the page with
   * router.refresh() instead of navigating. A same-URL navigation sends the
   * client state tree, so the server skips slots whose content is unchanged —
   * which would leave server-randomized content (e.g. the random show on an
   * artist page) stale.
   */
  refreshWhenCurrent?: boolean;
};

// The row is a single flex box holding the caller's left and right blocks.
// The active / pending bar is absolutely positioned at the left edge, and
// ROW_WITH_BAR adds its width (w-2) to the left padding, which is where an
// in-flow bar used to push the content. That saves a wrapper element per row.
const ROW_CLASSES = `
  relative relisten-row min-h-[56px] items-center justify-between border-b border-hairline p-2
  leading-tight tabular-nums hover:bg-surface-hover lg:min-h-[46px] lg:p-1
`;
const ROW_WITH_BAR = 'pl-4 lg:pl-3';
const ROW_BAR = 'absolute inset-y-0 left-0 w-2';

export const unwrapSegment = (val: unknown): string | undefined => {
  if (Array.isArray(val)) return val[0];
  return val as string | undefined;
};

function RowLinkContent({
  children,
  isActive,
  loading,
  refreshing = false,
  ...props
}: {
  children: React.ReactNode;
  isActive: boolean;
  loading?: boolean;
  refreshing?: boolean;
}) {
  const linkStatus = useLinkStatus();
  const isPending = linkStatus.isPending || refreshing;

  return (
    <Flex
      className={cn(ROW_CLASSES, {
        [ROW_WITH_BAR]: isPending || isActive,
        'opacity-70': isPending,
        'bg-accent/10 hover:bg-accent/15': isActive && !isPending,
      })}
      {...props}
    >
      {loading && <RowLoading />}
      {isPending && (
        <div className="absolute top-1/2 left-1/2 -translate-1/2 text-white/80 opacity-70">
          {/* <Spinner /> */}
        </div>
      )}
      {isPending && <div className={`${ROW_BAR} animate-pulse bg-relisten-600/30`} />}
      {!isPending && isActive && <div className={`${ROW_BAR} bg-accent`} />}
      {children}
    </Flex>
  );
}

/**
 * Mounted only while a row-triggered refresh is in flight, so idle rows don't
 * subscribe to navigation state. Calls onDone once the refresh has started and
 * settled (or after a timeout, in case it never reports as pending).
 */
function RefreshWatcher({ onDone }: { onDone: () => void }) {
  const isPending = usePendingNavigation();
  const sawPending = useRef(false);

  useEffect(() => {
    if (isPending) sawPending.current = true;
    else if (sawPending.current) onDone();
  }, [isPending, onDone]);

  useEffect(() => {
    const timeout = setTimeout(onDone, 10_000);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return null;
}

const Row = ({
  children,
  href,
  active = false,
  loading,
  refreshWhenCurrent = false,
  ...props
}: RowProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);
  const endRefresh = useCallback(() => setRefreshing(false), []);

  if (!href) {
    return (
      <Flex
        className={cn(ROW_CLASSES, {
          [ROW_WITH_BAR]: active,
          'bg-accent/10 hover:bg-accent/15': active,
        })}
      >
        {loading && <RowLoading />}
        {active && <div className={`${ROW_BAR} bg-accent`} />}
        {children}
      </Flex>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      data-is-active={active}
      onClick={(event) => {
        if (!refreshWhenCurrent || pathname !== href) return;
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        setRefreshing(true);
        router.refresh();
      }}
    >
      {refreshing && <RefreshWatcher onDone={endRefresh} />}
      <RowLinkContent isActive={active} loading={loading} refreshing={refreshing} {...props}>
        {children}
      </RowLinkContent>
    </Link>
  );
};

export default React.memo(Row);
