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
