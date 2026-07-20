import RelistenAPI from '@/lib/RelistenAPI';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const SongShowsColumn = async ({ artistSlug, slug }: { artistSlug: string; slug: string }) => {
  const song = await RelistenAPI.fetchSongShows(artistSlug, slug).catch(() => {
    deny(404);
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={song?.name}
      shows={song?.shows ?? []}
      fullDate
    />
  );
};

export default SongShowsColumn;
