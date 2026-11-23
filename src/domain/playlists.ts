import { z } from 'zod/v4';

// Playlists. The wire types mirror the parts of Relisten.Accounts.Contracts
// (RelistenApi: Playlists/PlaylistResponses.cs, PlaylistSharingContracts.cs,
// Library/FavoriteSyncContracts.cs) that the web reads, by hand. JSON is snake_case;
// pages render the view built in src/features/playlist, not these.

/** Only the fields the web reads; the contract has more. */
export interface PlaylistSummaryWire {
  playlist_id: string;
  name: string;
  entry_count: number;
  /** Absent in summaries stored before text entries existed: then every entry is a track. */
  track_count?: number;
  archived: boolean;
  revision: number;
  updated_at: string;
  public_code?: string | null;
  published?: boolean;
  taken_down?: boolean;
}

export interface PublicPlaylistOwnerWire {
  id: string;
  username: string;
}

/** An unavailable head (unpublished, archived, taken down, owner gone) carries only the id. */
export interface FollowedPlaylistHeadWire {
  playlist_id: string;
  available: boolean;
  public_code?: string;
  name?: string;
  owner?: PublicPlaylistOwnerWire;
  revision?: number;
}

export interface LibrarySnapshotWire {
  history_generation: string;
  playlists: PlaylistSummaryWire[];
  followed_playlists: FollowedPlaylistHeadWire[];
}

export interface PlaylistEntryWire {
  entry_id: string;
  /** Null for a text-only entry. */
  track_id: string | null;
  rank: string;
  description?: string | null;
}

export interface PlaylistSegmentWire {
  segment_id: string;
  rank: string;
  entries: PlaylistEntryWire[];
  description?: string | null;
}

export interface PlaylistMetadataWire {
  name: string;
  description?: string | null;
}

/** `GET /v1/playlists/{id}/snapshot`: segments and entries come in rank order. */
export interface PlaylistSnapshotWire {
  history_generation: string;
  playlist_id: string;
  revision: number;
  archived: boolean;
  metadata: PlaylistMetadataWire;
  segments: PlaylistSegmentWire[];
  updated_at: string;
  public_code?: string | null;
  published?: boolean;
  taken_down?: boolean;
}

/** `GET /v1/public-playlists/{code}`. */
export interface PublicPlaylistSnapshotWire {
  history_generation: string;
  playlist_id: string;
  public_code: string;
  revision: number;
  owner: PublicPlaylistOwnerWire;
  metadata: PlaylistMetadataWire;
  segments: PlaylistSegmentWire[];
}

/** One row of `GET /v1/public-playlists`: published, not archived or taken down, from an active owner. */
export interface PublicPlaylistListItemWire {
  playlist_id: string;
  public_code: string;
  name: string;
  owner: PublicPlaylistOwnerWire;
  track_count: number;
  duration_seconds: number;
  updated_at: string;
  follower_count: number;
  /** Plays started from the playlist over the last 30 days, today included. */
  recent_play_count: number;
}

/** `GET /v1/public-playlists`. A null cursor is the last page. */
export interface PublicPlaylistListWire {
  contract_version: number;
  playlists: PublicPlaylistListItemWire[];
  next_cursor: string | null;
}

/** A canonical playlist TypeID (`playlist_` and 26 base32 characters): what the play endpoint accepts. */
const PlaylistIdSchema = z.string().regex(/^playlist_[0-9a-z]{26}$/);
export const isPlaylistId = (id: unknown): id is string => PlaylistIdSchema.safeParse(id).success;

// ---- Authored content, as pages and the editor read it -------------------------

/**
 * A playlist's authored content: segments and entries in play order, with no
 * ranks (the server owns those). Descriptions are absent rather than blank.
 */
export type PlaylistContent = {
  playlistId: string;
  generation: string;
  revision: number;
  name: string;
  description?: string;
  segments: PlaylistContentSegment[];
};

export type PlaylistContentSegment = {
  id: string;
  description?: string;
  entries: PlaylistContentEntry[];
};

/** `trackId` is null for a text-only entry, which always has a description. */
export type PlaylistContentEntry = { id: string; trackId: string | null; description?: string };

const text = (s: string | null | undefined) => (s?.trim() ? s : undefined);

export function toPlaylistContent(
  s: Pick<
    PlaylistSnapshotWire,
    'playlist_id' | 'history_generation' | 'revision' | 'metadata' | 'segments'
  >
): PlaylistContent {
  return {
    playlistId: s.playlist_id,
    generation: s.history_generation,
    revision: s.revision,
    name: s.metadata.name,
    description: text(s.metadata.description),
    segments: s.segments.map((seg) => ({
      id: seg.segment_id,
      description: text(seg.description),
      entries: seg.entries.map((e) => ({
        id: e.entry_id,
        trackId: e.track_id,
        description: text(e.description),
      })),
    })),
  };
}

// ---- Writes (RelistenApi: Playlists/PlaylistRequests.cs, PlaylistResponses.cs) ----

/** The server's rule for a playlist's name: 1–100 characters, trimmed. */
export const PlaylistName = z
  .string()
  .trim()
  .min(1, 'Give it a name.')
  .max(100, 'Names can be up to 100 characters.');

export interface PlaylistEntryInputWire {
  entry_id: string;
  /** Omitted for a text-only entry. */
  track_id?: string;
  description?: string;
}

export interface PlaylistSegmentInputWire {
  segment_id: string;
  entries: PlaylistEntryInputWire[];
  description?: string;
}

/** `POST /v1/playlists`. */
export interface CreatePlaylistRequestWire {
  contract_version: 1;
  command_id: string;
  playlist_id: string;
  metadata: { name: string; description?: string };
  segments: PlaylistSegmentInputWire[];
}

export interface PlaylistCreatedWire {
  contract_version: 1;
  history_generation: string;
  playlist_id: string;
  revision: number;
}

/**
 * Where an entry moves: into an existing segment (after or before an entry in it,
 * else at its end), or into a new segment (after or before a segment, else last).
 */
export type PlaylistEntryDestinationWire =
  | { segment_id: string; after_entry_id?: string; before_entry_id?: string }
  | { new_segment_id: string; after_segment_id?: string; before_segment_id?: string };

/**
 * An operation's type and payload, by type. A text field that's present sets it
 * (null clears it); absent leaves it alone. Anchors that no longer exist fall
 * back to the end, as the server does.
 */
export type PlaylistOperationPayloads = {
  update_metadata: { name?: string; description?: string | null };
  insert_segment: {
    segment_id: string;
    entries: PlaylistEntryInputWire[];
    after_segment_id?: string;
    before_segment_id?: string;
    description?: string;
  };
  update_segment: { segment_id: string; description?: string | null };
  move_segment: { segment_id: string; after_segment_id?: string; before_segment_id?: string };
  delete_segment: { segment_id: string };
  insert_entries: {
    segment_id: string;
    entries: PlaylistEntryInputWire[];
    after_entry_id?: string;
    before_entry_id?: string;
  };
  update_entry: { entry_id: string; description?: string | null };
  move_entry: { entry_id: string; destination: PlaylistEntryDestinationWire };
  delete_entry: { entry_id: string };
};

export type PlaylistOperationType = keyof PlaylistOperationPayloads;

/** One operation, before it's sent: the envelope adds its id and base revision. */
export type PlaylistOp = {
  [T in PlaylistOperationType]: { operation_type: T; payload: PlaylistOperationPayloads[T] };
}[PlaylistOperationType];

export type PlaylistOperationWire = PlaylistOp & { operation_id: string; base_revision: number };

/** `PUT /v1/playlists/{id}/publication`: converges on the state asked for. */
export interface PlaylistPublicationWire {
  contract_version: 1;
  history_generation: string;
  playlist_id: string;
  published: boolean;
  public_code: string | null;
  changed: boolean;
}

/** `POST /v1/playlists/{id}/operations:batch`. */
export interface PlaylistBatchRequestWire {
  contract_version: 1;
  operations: PlaylistOperationWire[];
  /** Refuse the batch (409 `revision_conflict`) unless the playlist is at this revision. */
  expected_revision?: number;
}

/**
 * `applied` and `no_op` succeeded. The rest were skipped: `target_missing`,
 * `target_deleted`, `parent_missing` (its segment is gone), `id_conflict` (a
 * created ID was used before).
 */
export type PlaylistOperationStatus =
  | 'applied'
  | 'no_op'
  | 'target_missing'
  | 'target_deleted'
  | 'parent_missing'
  | 'id_conflict';

export interface PlaylistBatchResponseWire {
  contract_version: 1;
  history_generation: string;
  head_revision: number;
  results: { operation_id: string; status: PlaylistOperationStatus; revision: number | null }[];
}
