'use client';

import { createContext, use, type ReactNode } from 'react';
import type { QueueItem } from '@/player/queue/model';

/** A track table's visible rows (a song's performances, a show's tracks), in table order: what a row's play button queues. */
type SongQueue = { label: string; items: QueueItem[] };

const SongQueueContext = createContext<SongQueue | null>(null);

export function SongQueueProvider({ children, ...queue }: SongQueue & { children: ReactNode }) {
  return <SongQueueContext value={queue}>{children}</SongQueueContext>;
}

export const useSongQueue = () => use(SongQueueContext);
