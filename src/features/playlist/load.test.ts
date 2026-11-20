import { describe, expect, it } from 'vitest';
import type { PlaylistCatalog } from '@/data/playlists';
import type { PlaylistContent } from '@/domain/playlists';
import type { Artist, ShowSummary } from '@/domain/types';
import { songRowItem } from '@/player/queue/items';
import { playlistBlocks } from './blocks';
import { playlistView } from './load';
import { isTrackRow } from './spec';

const artists = new Map<string, Artist>([
  ['artist_gd', { id: 'artist_gd', slug: 'grateful-dead', name: 'Grateful Dead' } as Artist],
]);

const show: ShowSummary = {
  id: 'show_1',
  artistId: 'artist_gd',
  date: '1977-05-08',
  venue: { name: 'Barton Hall' },
  tapes: 3,
  sbd: true,
  rating: 9.5,
  plays30d: 10,
  addedAt: '2018-10-23T07:00:49Z',
};

const catalog: PlaylistCatalog = {
  tracks: {
    track_a: {
      id: 'track_a',
      sourceId: 'source_1',
      title: 'Scarlet Begonias',
      slug: 'scarlet-begonias',
      duration: 600,
      mp3Url: 'https://example.com/a.mp3',
      showId: 'show_1',
    },
  },
  shows: { show_1: show },
};

const playlist: PlaylistContent = {
  playlistId: 'playlist_1',
  generation: 'gen',
  revision: 3,
  name: 'Cornell',
  segments: [
    {
      id: 'seg_1',
      description: 'The first set',
      entries: [
        { id: 'entry_1', trackId: 'track_a' },
        { id: 'entry_2', trackId: null, description: 'Listen for the jam' },
      ],
    },
    {
      id: 'seg_2',
      entries: [
        // The same track again, and one the catalog doesn't have.
        { id: 'entry_3', trackId: 'track_a', description: 'Again' },
        { id: 'entry_4', trackId: 'track_gone' },
      ],
    },
  ],
};

describe('playlistView', () => {
  const view = playlistView(playlist, catalog, artists);

  it('keeps every entry in order: tracks, text and unavailable tracks', () => {
    expect(view.rows.map((r) => [r.id, r.kind, r.position])).toEqual([
      ['entry_1', 'track', 1],
      ['entry_2', 'text', 2],
      ['entry_3', 'track', 3],
      ['entry_4', 'unavailable', 4],
    ]);
    expect(view.trackCount).toBe(2);
    expect(view.duration).toBe(1200);
  });

  it('heads only segments with a description', () => {
    expect(view.rows.map((r) => r.segment?.id ?? null)).toEqual(['seg_1', 'seg_1', null, null]);
  });

  it('queues a repeated track once per entry', () => {
    const items = view.rows.flatMap((r) => (isTrackRow(r) ? (songRowItem(r) ?? []) : []));
    expect(items.map((i) => [i.key, i.trackId])).toEqual([
      ['entry_1', 'track_a'],
      ['entry_3', 'track_a'],
    ]);
  });

  it('renders prose, with timestamps that play only entries the catalog has', () => {
    const gone = 'playlist_entry_01k8000000e008000000000004';
    const withLinks: PlaylistContent = {
      ...playlist,
      segments: [
        {
          id: 'seg_1',
          entries: [{ id: 'entry_1', trackId: 'track_a', description: 'Peak at 5:00, not 12:00' }],
        },
        // Prose alone, between groups.
        { id: 'seg_prose', description: `See [the gone one](#entry=${gone}&t=1:00)`, entries: [] },
        { id: 'seg_2', entries: [{ id: gone, trackId: 'track_gone', description: 'At 0:30' }] },
      ],
    };
    const rows = playlistView(withLinks, catalog, artists).rows;
    expect(rows.map((r) => [r.id, r.kind])).toEqual([
      ['entry_1', 'track'],
      ['seg_prose', 'text'],
      [gone, 'unavailable'],
    ]);
    const json = (i: number) => JSON.stringify(rows[i].prose);
    // Within the track's 600s; 12:00 is past it.
    expect(json(0)).toContain('"seek":{"entryId":"entry_1","seconds":300}');
    expect(json(0)).not.toContain('"seconds":720');
    // An unavailable entry can't be played, from its own note or elsewhere.
    expect(json(1)).not.toContain('"seek"');
    expect(json(2)).not.toContain('"seek"');
  });

  it('links a track to its show page, on its tape', () => {
    const row = view.rows[0];
    expect(isTrackRow(row) && row.href).toBe('/artists/grateful-dead/shows/1977-05-08?source=1');
  });
});

describe('playlistBlocks', () => {
  const blocks = playlistBlocks(playlistView(playlist, catalog, artists).rows);
  const shape = (b: (typeof blocks)[number]): string =>
    b.kind === 'tracks'
      ? `tracks:${b.rows.map((r) => r.id)}`
      : b.kind === 'section'
        ? `section(${b.items.map(shape)})`
        : b.kind;

  it('boxes a described segment with its entries; loose tracks run together', () => {
    expect(blocks.map(shape)).toEqual(['section(tracks:entry_1,text)', 'tracks:entry_3,entry_4']);
  });
});
