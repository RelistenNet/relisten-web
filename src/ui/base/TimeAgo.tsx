'use client';

import { useSyncExternalStore } from 'react';
import { secondsClock } from '@/lib/secondsClock';

/** "12s" / "3m": compact elapsed time. */
export const formatAgo = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`;
};

type Props = {
  /** Epoch ms the elapsed time counts from. */
  at: number;
  /** Server render time, used while hydrating so the text matches the HTML. */
  serverNow: number;
};

/** Live-updating elapsed time. Only this text re-renders each second, not its parent. */
export default function TimeAgo({ at, serverNow }: Props) {
  const nowSecond = useSyncExternalStore(secondsClock.subscribe, secondsClock.getSnapshot, () =>
    Math.floor(serverNow / 1000)
  );
  return <>{formatAgo(nowSecond * 1000 - at)}</>;
}
