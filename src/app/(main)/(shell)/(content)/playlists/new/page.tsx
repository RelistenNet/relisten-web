import NewPlaylist from '@/features/playlist/NewPlaylist';

/** Starting a playlist: signed-in listeners only. */
export default function Page() {
  return <NewPlaylist />;
}

export const metadata = () => ({ title: 'New Playlist' });
