import { METADATA_BASE } from "@/lib/constants";
import RelistenAPI from "@/lib/RelistenAPI";
import { createShowDate } from "@/lib/utils";
import ShowLandingPage from "@/components/ShowLandingPage";
import { deny, getSegmentParams } from "@timber-js/app/server";
import { SEGMENT_PATH } from "./$segment";

export default async function Page() {
  const { artistSlug, year, month, day } = getSegmentParams(SEGMENT_PATH);

  if (!artistSlug || !year || !month || !day) return deny(404);

  const displayDate = createShowDate(year, month, day);

  const [show, artists] = await Promise.all([
    RelistenAPI.fetchShow(artistSlug, year, displayDate),
    RelistenAPI.fetchAllArtists(),
  ]);

  if (!show) return deny(404);

  const artist = artists?.find((a) => a.slug === artistSlug);

  return (
    <ShowLandingPage
      show={show}
      artist={artist}
      artistSlug={artistSlug}
      year={year}
      month={month}
      day={day}
    />
  );
}

export const metadata = async () => {
  const { artistSlug, year, month, day } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug || !year || !month || !day) return {};

  const artists = await RelistenAPI.fetchAllArtists();
  const name = artists?.find((a) => a.slug === artistSlug)?.name;
  if (!name) return {};

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  return {
    title: [createShowDate(year, month, day), name].join(" | "),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(" "),
    openGraph: {
      images: show?.uuid
        ? [
            {
              url: `${METADATA_BASE.origin}/album-art/${show.uuid}.png`,
              width: 550,
              height: 550,
            },
          ]
        : [],
    },
  };
};
