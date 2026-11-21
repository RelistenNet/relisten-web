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

type WirePlaylist = (typeof opVectors.vectors)[number]['before'];

const toContent = (p: WirePlaylist): PlaylistContent => ({
  playlistId: 'playlist',
  generation: 'g',
  revision: 1,
  name: p.name,
  description: 'description' in p ? (p.description as string) : undefined,
  segments: p.segments.map((s) => ({
    id: s.id,
    description: 'description' in s ? (s.description as string) : undefined,
    entries: s.entries.map((e) => ({
      id: e.id,
      trackId: e.track_id,
      description: 'description' in e ? (e.description as string) : undefined,
    })),
  })),
});

const upstream = (file: string) =>
  resolve(__dirname, '../../../RelistenApi/RelistenUserServiceTests/Fixtures/playlists', file);

describe('shared playlist operation vectors', () => {
  it.each(opVectors.vectors.map((v) => [v.name, v] as const))('%s', (_, vector) => {
    let content = toContent(vector.before);
    const statuses = (vector.operations as PlaylistOp[]).map((op) => {
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
