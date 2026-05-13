import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import ClipEditor from './ClipEditor';

export default async function Page() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  if (!artistSlug || !year || !month || !day || !songSlug) {
    return <div className="p-4">Missing route params.</div>;
  }

  const { source } = sourceSearchParamsLoader.get();

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  const sources = show?.sources ?? [];
  const activeSourceId = Number(source) || sources[0]?.id;
  const activeSource = sources.find((s) => s.id === activeSourceId) ?? sources[0];

  const tracks = activeSource?.sets?.flatMap((set) => set.tracks ?? []) ?? [];
  const track = tracks.find((t) => t.slug === songSlug);

  if (!track || !track.mp3_url) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold">Clip editor</h1>
        <p>Track not found or no mp3 URL: {songSlug}</p>
      </div>
    );
  }

  const displayDate = createShowDate(year, month, day);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-lg font-semibold">
        Clip: {track.title} — {artistSlug} {displayDate}
      </h1>
      <ClipEditor
        url={track.mp3_url}
        title={track.title ?? songSlug}
        duration={track.duration ?? 0}
      />
    </div>
  );
}
