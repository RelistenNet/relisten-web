import RelistenAPI from '@/lib/RelistenAPI';
import { slimShows } from '@/lib/slimShow';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const SongShowsColumn = async ({ artistSlug, slug, quickHitSegment }: { artistSlug: string; slug: string; quickHitSegment?: string }) => {
  const song = await RelistenAPI.fetchSongShows(artistSlug, slug).catch(() => {
    deny(404);
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={song?.name}
      shows={slimShows(song?.shows)}
      fullDate
      quickHitSegment={quickHitSegment}
      quickHitSlug={slug}
    />
  );
};

export default SongShowsColumn;
