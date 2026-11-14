import { livePlays, liveSummary } from '@/data/live';
import { slimSummary } from '@/lib/live';
import { getCurrentMonthDay } from '@/lib/timezone';
import LiveListeners from './LiveListeners';
import PlaybackFeed from './PlaybackFeed';

export default async function Page() {
  const current = await getCurrentMonthDay();
  const today = { month: Number(current.month), day: Number(current.day) };

  const [summary, history] = await Promise.all([liveSummary(today), livePlays(0, 30)]);

  // Request-scoped server render: reading the clock once here is intended.
  const renderedAt = Date.now();

  return (
    <LiveListeners
      initialSummary={slimSummary(summary, today)}
      today={today}
      feed={<PlaybackFeed initialPlays={history} renderedAt={renderedAt} />}
    />
  );
}

export const metadata = {
  title: 'Live',
};
