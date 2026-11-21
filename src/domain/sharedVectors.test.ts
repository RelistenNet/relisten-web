import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import opVectors from './__fixtures__/playlist-op-vectors.json';
import typeIdVectors from './__fixtures__/typeid-vectors.json';
import { applyOp } from './playlistOps';
import type { PlaylistContent, PlaylistOp } from './playlists';
import { isTypeId, type TypeIdPrefix, typeIdForUuid } from './typeid';

// Vectors shared with the User Service (RelistenApi:
// RelistenUserServiceTests/Fixtures/playlists), which runs the same files against
// its own TypeID encoding and its PlaylistEditor. Each side's copy must match.

/** A playlist as the vectors write it: segments and entries in order. */
type WirePlaylist = {
  name: string;
  description?: string;
  segments: {
    id: string;
    description?: string;
    entries: { id: string; track_id: string | null; description?: string }[];
  }[];
};
type OpVector = {
  name: string;
  before: WirePlaylist;
  operations: PlaylistOp[];
  statuses: string[];
  after: WirePlaylist;
};
const vectors = opVectors.vectors as OpVector[];

const toContent = (p: WirePlaylist): PlaylistContent => ({
  playlistId: 'playlist',
  generation: 'g',
  revision: 1,
  name: p.name,
  description: p.description,
  segments: p.segments.map((s) => ({
    id: s.id,
    description: s.description,
    entries: s.entries.map((e) => ({
      id: e.id,
      trackId: e.track_id,
      description: e.description,
    })),
  })),
});

const upstream = (file: string) =>
  resolve(__dirname, '../../../RelistenApi/RelistenUserServiceTests/Fixtures/playlists', file);

describe('shared playlist operation vectors', () => {
  it.each(vectors.map((v) => [v.name, v] as const))('%s', (_, vector) => {
    let content = toContent(vector.before);
    const statuses = vector.operations.map((op) => {
      const result = applyOp(content, op);
      content = result.content;
      return result.status;
    });
    expect(statuses).toEqual(vector.statuses);
    expect(content).toEqual(toContent(vector.after));
  });

  it('matches the User Service’s copy', () => {
    const file = upstream('playlist-op-vectors.json');
    if (!existsSync(file)) return;
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(opVectors);
  });
});

describe('shared TypeID vectors', () => {
  it.each(typeIdVectors.vectors.map((v) => [v.typeid, v] as const))('%s', (_, vector) => {
    expect(typeIdForUuid(vector.prefix, vector.uuid)).toBe(vector.typeid);
    if (vector.prefix !== 'prefix')
      expect(isTypeId(vector.typeid, vector.prefix as TypeIdPrefix)).toBe(true);
  });

  it('matches the User Service’s copy', () => {
    const file = upstream('typeid-vectors.json');
    if (!existsSync(file)) return;
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(typeIdVectors);
  });
});
