import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const SongShowsColumn = async ({ artistSlug, slug }: { artistSlug: string; slug: string }) => {
  const [song, initialFilters] = await Promise.all([
    RelistenAPI.fetchSongShows(artistSlug, slug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    deny(404);
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={song.name}
      shows={song.shows || []}
      initialFilters={initialFilters}
      backHref={`/${artistSlug}/songs`}
      fullDate
    />
  );
};

export default SongShowsColumn;
