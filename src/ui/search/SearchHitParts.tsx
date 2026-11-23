import {
  AudioLinesIcon,
  CalendarIcon,
  CassetteTapeIcon,
  MapPinIcon,
  MessageSquareQuoteIcon,
  UsersRoundIcon,
  MusicIcon,
  RouteIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ExcerptRun, SearchHit, SearchKind } from '@/lib/search';
import { KIND_LABEL } from '@/lib/search';
import cn from '@/lib/cn';

// The parts of a search result the /search page and the nav bar's combobox
// share: the kind's icon, the title with its context line, and an excerpt.
// No hooks: rendered on the server by the page and on the client by the combobox.

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  artist: UsersRoundIcon,
  song: MusicIcon,
  venue: MapPinIcon,
  tour: RouteIcon,
  show: CalendarIcon,
  performance: AudioLinesIcon,
  recording: CassetteTapeIcon,
  review: MessageSquareQuoteIcon,
};

export function KindIcon({ kind, className }: { kind: SearchKind; className?: string }) {
  const Icon = KIND_ICON[kind];
  return <Icon aria-hidden className={cn('size-4 shrink-0 text-text-muted', className)} />;
}

export function Excerpt({ runs, className }: { runs: ExcerptRun[]; className?: string }) {
  return (
    <span className={cn('line-clamp-2 text-text-secondary', className)}>
      {runs.map((run, i) =>
        run.match ? (
          <mark key={i} className="bg-transparent font-semibold text-text-primary">
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        )
      )}
    </span>
  );
}

/** Title, the kind and context line, then the excerpt. */
export function HitText({ hit, compact = false }: { hit: SearchHit; compact?: boolean }) {
  const detail = [KIND_LABEL[hit.kind], ...hit.detail].join(' · ');
  return (
    <span className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium text-text-primary">{hit.title}</span>
        {hit.soundboard && (
          <span className="shrink-0 rounded-xs border border-hairline px-1 text-[10px] leading-4 font-medium text-text-muted">
            SBD
          </span>
        )}
      </span>
      <span className="truncate text-xs text-text-muted">{detail}</span>
      {hit.excerpt && !compact && <Excerpt runs={hit.excerpt} className="mt-0.5 text-xs" />}
    </span>
  );
}
