import { getArtistGradient } from '@/lib/artistColors';

// An artist's cover: their gradient (stable per artist id, the same one the
// album art uses) with their initials. Decorative: the title names the artist.

const initials = (name: string) =>
  name
    .replace(/^the\s+/i, '')
    .split(/\s+/)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function ArtistCover({ artist }: { artist: { id: string; name: string } }) {
  return (
    <div
      aria-hidden
      className="
        flex size-14 items-center justify-center rounded-lg text-xl font-semibold text-black/60
        outline-1 -outline-offset-1 outline-white/10 select-none sm:size-16 sm:text-2xl
      "
      style={{ backgroundImage: getArtistGradient(artist.id) }}
    >
      {initials(artist.name)}
    </div>
  );
}
