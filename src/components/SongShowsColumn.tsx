import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { notFound } from 'next/navigation';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const SongShowsColumn = async ({ artistSlug, slug }: { artistSlug: string; slug: string }) => {
  const [song, initialFilters] = await Promise.all([
    RelistenAPI.fetchSongShows(artistSlug, slug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
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
