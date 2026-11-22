// One-shot playlist writes from anywhere on the site (the Add to Playlist menu),
// without an editor open. Each is one request with fresh IDs, so retrying it
// is safe. Tracks added together go in as one segment, so a run (Twist → Jam)
// stays together under shuffle.

import type { PlaylistEntryInputWire, PlaylistSummaryWire } from '@/domain/playlists';
import { newTypeId } from '@/domain/typeid';
import { type PlaylistTransport, playlistTransport } from './transport';

export type OwnPlaylist = {
  id: string;
  name: string;
  trackCount: number;
  revision: number;
  updatedAt: string;
};

const entries = (trackIds: readonly string[]): PlaylistEntryInputWire[] =>
  trackIds.map((track_id) => ({ entry_id: newTypeId('playlist_entry'), track_id }));

/** The listener's playlists that can take tracks (not archived), most recently changed first. */
export async function ownPlaylists(
  transport: PlaylistTransport = playlistTransport
): Promise<OwnPlaylist[]> {
  const library = await transport.library();
  return library.playlists
    .filter((p: PlaylistSummaryWire) => !p.archived)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((p) => ({
      id: p.playlist_id,
      name: p.name,
      trackCount: p.track_count ?? p.entry_count,
      revision: p.revision,
      updatedAt: p.updated_at,
    }));
}

/** A new playlist, holding these tracks (none is fine). */
export async function createPlaylist(
  { name, trackIds = [] }: { name: string; trackIds?: readonly string[] },
  transport: PlaylistTransport = playlistTransport
): Promise<{ playlistId: string; revision: number }> {
  const playlistId = newTypeId('playlist');
  const created = await transport.create({
    contract_version: 1,
    command_id: newTypeId('command'),
    playlist_id: playlistId,
    metadata: { name },
    segments: trackIds.length
      ? [{ segment_id: newTypeId('playlist_segment'), entries: entries(trackIds) }]
      : [],
  });
  return { playlistId: created.playlist_id, revision: created.revision };
}

/**
 * Appends tracks to a playlist as one new segment. Its ID (and the revision it
 * made) is what undo removes.
 *
 * The batch isn't held to a revision (no expected_revision): an append fits
 * whatever the playlist has become. Each operation still says which revision it
 * was made against, as the server records: the one the menu listed.
 */
export async function addToPlaylist(
  playlist: { id: string; revision: number },
  trackIds: readonly string[],
  transport: PlaylistTransport = playlistTransport
): Promise<{ segmentId: string; revision: number }> {
  const segmentId = newTypeId('playlist_segment');
  const response = await transport.batch(playlist.id, [
    {
      operation_id: newTypeId('playlist_operation'),
      base_revision: playlist.revision,
      operation_type: 'insert_segment',
      payload: { segment_id: segmentId, entries: entries(trackIds) },
    },
  ]);
  return { segmentId, revision: response.head_revision };
}

/** Undoes addToPlaylist, made against the revision the add made. */
export async function removeSegment(
  playlistId: string,
  added: { segmentId: string; revision: number },
  transport: PlaylistTransport = playlistTransport
): Promise<void> {
  const { segmentId, revision } = added;
  await transport.batch(playlistId, [
    {
      operation_id: newTypeId('playlist_operation'),
      base_revision: revision,
      operation_type: 'delete_segment',
      payload: { segment_id: segmentId },
    },
  ]);
}
