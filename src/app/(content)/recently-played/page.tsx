import RelistenAPI from '@/lib/RelistenAPI';
import { mergePlays, slimPlays } from '@/lib/live';
import { getCurrentMonthDay } from '@/lib/timezone';
import LiveNow from './LiveNow';

export default async function Page() {
  const [history, today] = await Promise.all([
    RelistenAPI.fetchLiveHistory(1000),
    getCurrentMonthDay(),
  ]);

  // Request-scoped server render: reading the clock once here is intended.
  // oxlint-disable-next-line react/purity
  const renderedAt = Date.now();
  // History comes back oldest-first; mergePlays sorts newest-first and trims to the window.
  const initialPlays = mergePlays([], slimPlays(history), renderedAt);

  return (
    <LiveNow
      initialPlays={initialPlays}
      monthDay={`${today.month}-${today.day}`}
      renderedAt={renderedAt}
    />
  );
}

export const metadata = {
  title: 'Live',
};
