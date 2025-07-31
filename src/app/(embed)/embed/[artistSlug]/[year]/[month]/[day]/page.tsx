import RelistenAPI from '@/lib/RelistenAPI';
import type { RawParams } from '@/types/params';
import { notFound, redirect } from 'next/navigation';

interface EmbedShowPageProps {
  params: Promise<RawParams>;
}

export default async function EmbedShowPage({ params }: EmbedShowPageProps) {
  const { artistSlug, year, month, day } = await params;

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
    notFound();
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

export async function generateMetadata(props: EmbedShowPageProps) {
  const params = await props.params;
  const { artistSlug, year, month, day } = params;

  return {
    title: `${artistSlug} - ${year}/${month}/${day}`,
    description: `Embedded view of ${artistSlug} show from ${year}/${month}/${day}`,
  };
}
