import { describe, expect, it } from 'vitest';
import { gd770508 } from '@/data/__fixtures__';
import { toShowDetail } from '@/data/summaries';
import { showTrackItem } from '@/player/queue/items';
import { songsProjection, tapesProjection } from './showProjection';
import { sortSources } from './sortSources';

const show = toShowDetail(gd770508);
const songs = songsProjection(show);
const tapes = tapesProjection(show);

describe('songsProjection', () => {
  it('builds the same queue items as the full show', () => {
    const who = { artistSlug: 'grateful-dead', artistName: 'Grateful Dead' };
    const full = show.sources.flatMap((s) =>
      s.sets.flatMap((set) => set.tracks.map((track) => showTrackItem({ show, track, ...who })))
    );
    // As PlayingTrackList does: a track's source id is its tape's.
    const slim = songs.sources.flatMap((s) =>
      s.sets.flatMap((set) =>
        set.tracks.map((track) =>
          showTrackItem({ show: songs, track: { ...track, sourceId: s.id }, ...who })
        )
      )
    );
    expect(full.length).toBeGreaterThan(0);
    expect(slim).toEqual(full);
  });

  it('keeps every tape, and drops what no column reads', () => {
    expect(songs.sources.map((s) => s.id)).toEqual(show.sources.map((s) => s.id));
    const track = songs.sources[0]?.sets[0]?.tracks[0];
    expect(track).toBeDefined();
    expect(track).not.toHaveProperty('flacUrl');
    expect(track).not.toHaveProperty('position');
    expect(track).not.toHaveProperty('sourceId');
    expect(songs.sources[0]).not.toHaveProperty('taperNotes');
  });
});

describe('tapesProjection', () => {
  it('has no tracks or links', () => {
    for (const s of tapes.sources) {
      expect(s).not.toHaveProperty('sets');
      expect(s).not.toHaveProperty('links');
    }
  });
});

it('both columns order tapes as the full show does', () => {
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  const expected = ids(sortSources(show.sources));
  expect(ids(sortSources(songs.sources))).toEqual(expected);
  expect(ids(sortSources(tapes.sources))).toEqual(expected);
});
