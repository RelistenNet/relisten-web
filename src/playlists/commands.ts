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

/** Appends tracks to a playlist as one new segment. Its ID is what undo removes. */
export async function addToPlaylist(
  playlistId: string,
  trackIds: readonly string[],
  transport: PlaylistTransport = playlistTransport
): Promise<{ segmentId: string; revision: number }> {
  const segmentId = newTypeId('playlist_segment');
  const response = await transport.batch(playlistId, [
    {
      operation_id: newTypeId('playlist_operation'),
      // Informational: the batch isn't held to a revision, so it always appends.
      base_revision: 0,
      operation_type: 'insert_segment',
      payload: { segment_id: segmentId, entries: entries(trackIds) },
    },
  ]);
  return { segmentId, revision: response.head_revision };
}

/** Undoes addToPlaylist. */
export async function removeSegment(
  playlistId: string,
  segmentId: string,
  transport: PlaylistTransport = playlistTransport
): Promise<void> {
  await transport.batch(playlistId, [
    {
      operation_id: newTypeId('playlist_operation'),
      base_revision: 0,
      operation_type: 'delete_segment',
      payload: { segment_id: segmentId },
    },
  ]);
}
