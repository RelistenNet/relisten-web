import PublicPlaylistsIndex, {
  publicPlaylistsIndexMetadata,
} from '@/features/playlist/PublicPlaylistsIndex';

/** Every published playlist. */
export default function Page() {
  return <PublicPlaylistsIndex />;
}

export const metadata = () => publicPlaylistsIndexMetadata({});
