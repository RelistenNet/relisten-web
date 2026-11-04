import RelistenAPI from '@/lib/RelistenAPI';
import { mergePlays, slimPlays, slimSummary } from '@/lib/live';
import { getCurrentMonthDay } from '@/lib/timezone';
import LiveNow from './LiveNow';

export default async function Page() {
  const today = await getCurrentMonthDay();
  const monthDay = `${today.month}-${today.day}`;

  const [summary, history] = await Promise.all([
    RelistenAPI.fetchLiveSummary(monthDay),
    RelistenAPI.fetchLiveHistory(30),
  ]);

  const renderedAt = Date.now();

  return (
    <LiveNow
      initialSummary={slimSummary(summary, monthDay)}
      initialPlays={mergePlays([], slimPlays(history))}
      monthDay={monthDay}
      renderedAt={renderedAt}
    />
  );
}

export const metadata = {
  title: 'Live',
};
