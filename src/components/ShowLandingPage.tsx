import { Link } from "@timber-js/app/client";
import { METADATA_BASE } from "@/lib/constants";
import { durationToHHMMSS, removeLeadingZero } from "@/lib/utils";
import { sortSources } from "@/lib/sortSources";
import Tag from "./Tag";
import type { Artist, Source, Tape } from "@/types";
import ScrollToTrack from "./ScrollToTrack";

function formatDisplayDate(year: string, month: string, day: string) {
  return `${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year}`;
}

function SourceBadges({ source }: { source: Source }) {
  return (
    <div className="flex flex-wrap gap-1">
      {source.is_soundboard && <Tag variant="info">SBD</Tag>}
      {source.flac_type === "Flac16Bit" && <Tag variant="info">FLAC</Tag>}
      {source.flac_type === "Flac24Bit" && <Tag variant="info">FLAC 24-bit</Tag>}
      {source.is_remaster && <Tag variant="info">REMASTER</Tag>}
    </div>
  );
}

function SourceDetails({ source }: { source: Source }) {
  const details = [
    source.taper && { label: "Taper", value: source.taper },
    source.transferrer && { label: "Transferrer", value: source.transferrer },
    source.lineage && { label: "Lineage", value: source.lineage },
    source.source && { label: "Source", value: source.source },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-3">
        <SourceBadges source={source} />
        {(source.avg_rating ?? 0) > 0 && (
          <span className="text-foreground-muted">
            {source.avg_rating?.toFixed(1)} / 10
            {source.num_reviews ? ` (${source.num_reviews} reviews)` : ""}
          </span>
        )}
      </div>
      {details.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {details.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-foreground-muted">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function ShowLandingPage({
  show,
  artist,
  artistSlug,
  year,
  month,
  day,
  songSlug,
}: {
  show: Partial<Tape>;
  artist?: Artist;
  artistSlug: string;
  year: string;
  month: string;
  day: string;
  songSlug?: string;
}) {
  const sources = sortSources(show.sources ?? []);
  const bestSource = sources[0];

  return (
    <div className="w-full max-w-xl">
      {songSlug && <ScrollToTrack />}

      {show.uuid && (
        <div className="mb-6 flex justify-center">
          <img
            src={`${METADATA_BASE.origin}/album-art/${show.uuid}.png?size=512`}
            alt={`${artist?.name ?? artistSlug} – ${formatDisplayDate(year, month, day)}`}
            width={512}
            height={512}
            className="w-full max-w-sm rounded-lg shadow-lg"
          />
        </div>
      )}

      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold">{formatDisplayDate(year, month, day)}</h1>
        {artist && (
          <p className="mt-1 text-lg text-foreground-muted">{artist.name}</p>
        )}
      </div>

      {show.venue && (
        <div className="mb-6 text-center text-sm text-foreground-muted">
          <p className="font-medium">{show.venue.name}</p>
          {show.venue.location && <p>{show.venue.location}</p>}
          {(show.venue.shows_at_venue ?? 0) > 1 && (
            <p className="mt-1 text-xs">
              {show.venue.shows_at_venue} shows at this venue
            </p>
          )}
        </div>
      )}

      {bestSource && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Source {sources.length > 1 ? `1 of ${sources.length}` : ""}
            </span>
            {bestSource.duration && bestSource.duration > 0 && (
              <span className="text-xs text-foreground-muted">
                {durationToHHMMSS(bestSource.duration)}
              </span>
            )}
          </div>
          <SourceDetails source={bestSource} />
        </div>
      )}

      {bestSource?.sets && bestSource.sets.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-surface">
          {bestSource.sets.map((set, setIdx) => (
            <div key={set.id ?? setIdx}>
              {bestSource.sets!.length > 1 && (
                <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
                  {set.name || `Set ${setIdx + 1}`}
                  {set.tracks && (
                    <span className="ml-2">
                      {durationToHHMMSS(
                        set.tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
                      )}
                    </span>
                  )}
                </div>
              )}
              {set.tracks?.map((track, trackIdx) => {
                const isActive = songSlug === track.slug;
                return (
                  <div
                    key={track.id ?? trackIdx}
                    id={isActive ? "active-track" : undefined}
                    className={`flex items-center justify-between border-b border-border px-4 py-2.5 last:border-b-0 ${
                      isActive ? "bg-relisten-100/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-right text-xs text-foreground-muted">
                        {track.track_position ?? trackIdx + 1}
                      </span>
                      <span className={isActive ? "font-medium" : ""}>
                        {track.title}
                      </span>
                    </div>
                    {track.duration && (
                      <span className="ml-4 shrink-0 text-xs text-foreground-muted">
                        {durationToHHMMSS(track.duration)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pb-8">
        <Link
          href={`/${artistSlug}/${year}`}
          className="rounded-lg bg-relisten-600 px-6 py-3 font-medium text-white transition-colors hover:bg-relisten-700"
        >
          Listen on Relisten
        </Link>
      </div>
    </div>
  );
}
