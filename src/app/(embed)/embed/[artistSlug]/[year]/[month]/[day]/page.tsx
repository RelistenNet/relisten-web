import RelistenAPI from '@/lib/RelistenAPI';
import { deny, getSegmentParams, redirect } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function EmbedShowPage() {
  const { artistSlug, year, month, day } = getSegmentParams(SEGMENT_PATH);

  if (!artistSlug || !year || !month || !day) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Invalid show parameters
      </div>
    );
  }

  const displayDate = [year, month, day].join('-');
  const show = await RelistenAPI.fetchShow(artistSlug, year, displayDate);

  if (!show) {
    deny(404);
  }

  // Find the first song from the first source and redirect to it
  const firstSource = show.sources?.[0];
  const firstSet = firstSource?.sets?.[0];
  const firstTrack = firstSet?.tracks?.[0];

  if (!firstTrack) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        No songs available for this show
      </div>
    );
  }

  redirect(`/embed/${artistSlug}/${year}/${month}/${day}/${firstTrack.slug}?playImmediately=false`);
}

export async function metadata() {
  const params = getSegmentParams();
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  const month = params?.month as string | undefined;
  const day = params?.day as string | undefined;
  if (!artistSlug || !year || !month || !day) return {};

  return {
    title: `${artistSlug} - ${year}/${month}/${day}`,
    description: `Embedded view of ${artistSlug} show from ${year}/${month}/${day}`,
  };
}
