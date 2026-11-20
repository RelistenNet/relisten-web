// Timestamps in guide descriptions: `m:ss` or `h:mm:ss`, seconds always two
// digits. The same grammar as the User Service's link check
// (RelistenApi: RelistenUserService/Playlists/GuideMarkdownPolicy.cs).

const TIMESTAMP = String.raw`[0-9]+:[0-5][0-9]:[0-5][0-9]|[0-9]+:[0-5][0-9]`;

/** `#t=6:42`: a moment in the description's own track. */
export const OWN_TIMESTAMP_LINK = new RegExp(`^#t=(${TIMESTAMP})$`);

/** `#entry=playlist_entry_…&t=6:42`: a moment in another entry. */
export const ENTRY_TIMESTAMP_LINK = new RegExp(
  `^#entry=(playlist_entry_[0-9a-z]{26})&t=(${TIMESTAMP})$`
);

/** A bare timestamp in prose: not part of a longer run of digits and colons. */
export const BARE_TIMESTAMP = new RegExp(`(?<![0-9:])(?:${TIMESTAMP})(?![0-9:])`, 'g');

/** Seconds for a timestamp the grammar accepts. */
export function timestampSeconds(timestamp: string): number {
  return timestamp.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}
