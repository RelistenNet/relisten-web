'use client';

import { href } from '@timber-js/app/routes';
import { useRouter } from '@timber-js/app/client';

type Props = {
  venueSlug: string;
  /** The artist in the URL path, if the page is scoped to one. */
  artistSlug?: string;
  artists: { slug: string; name: string; count: number }[];
};

/** Switches a venue page between all artists (/venues/x) and one (/artists/a/venues/x). */
export default function ArtistScopeSelect({ venueSlug, artistSlug, artists }: Props) {
  const router = useRouter();
  return (
    <select
      name="artist"
      aria-label="Artist"
      value={artistSlug ?? ''}
      onChange={(e) => {
        const artistSlug = e.target.value;
        router.push(
          artistSlug
            ? href('/artists/[artistSlug]/venues/[venueSlug]', { artistSlug, venueSlug })
            : href('/venues/[venueSlug]', { venueSlug })
        );
      }}
      className="
        self-start rounded-md border border-hairline bg-surface px-2 py-1.5 text-base
        text-text-primary sm:text-sm
      "
    >
      <option value="">All artists ({artists.reduce((n, a) => n + a.count, 0)})</option>
      {artists.map((a) => (
        <option key={a.slug} value={a.slug}>
          {a.name} ({a.count})
        </option>
      ))}
    </select>
  );
}
