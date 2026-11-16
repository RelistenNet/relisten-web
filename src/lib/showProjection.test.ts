import { describe, expect, it } from 'vitest';
import { gd770508 } from '@/data/__fixtures__';
import { toShowDetail } from '@/data/summaries';
import { showContext, showTrackItem } from '@/player/queue/items';
import { songsProjection, tapesProjection } from './showProjection';
import { toSourceParam } from './sourceParam';
import { activeTape, sortSources } from './sortSources';

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

  it('plays a tape as the full show does: the player takes the projected tape', () => {
    const who = { artistSlug: 'grateful-dead', artistName: 'Grateful Dead' };
    for (const source of show.sources) {
      const tape = songs.sources.find((s) => s.id === source.id);
      expect(tape).toBeDefined();
      if (!tape) return;
      expect(showContext({ show: songs, source: tape, ...who })).toEqual(
        showContext({ show, source, ...who })
      );
    }
  });

  it('is one object per show, so the layout and the track page share their tapes', () => {
    expect(songsProjection(show)).toBe(songs);
    expect(songsProjection(toShowDetail(gd770508))).not.toBe(songs);
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

describe('activeTape', () => {
  it('picks the tape ?source= names, in either form, and the top-sorted one otherwise', () => {
    const top = sortSources(songs.sources)[0];
    const other = sortSources(songs.sources).at(-1);
    if (!other) throw new Error('fixture has no tapes');
    expect(other.id).not.toBe(top?.id);
    expect(activeTape(songs.sources, toSourceParam(other.id))).toBe(other);
    expect(activeTape(songs.sources, other.id)).toBe(other);
    expect(activeTape(songs.sources, undefined)).toBe(top);
    expect(activeTape(songs.sources, 'not-a-tape')).toBe(top);
    expect(activeTape([], undefined)).toBeUndefined();
  });
});
