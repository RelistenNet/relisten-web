import type { Source } from '@/domain/types';

const getEtreeId = (s = '') =>
  Number(
    s
      .split('.')
      .reverse()
      .find((x) => /^[0-9]+$/.test(x))
  );

// tapes: TODO: GD sort (charlie miller, sbd + etree id, weighted average), sbd + etree id, weighted avg, asc, desc
// for now, hardcode sort: sbd, charlie miller, etree id, weighted average

/** What the sort reads: a column's slimmed tapes keep these, so every column orders tapes alike. */
export type SortableSource = Pick<
  Source,
  | 'id'
  | 'isSoundboard'
  | 'taper'
  | 'transferrer'
  | 'source'
  | 'upstreamIdentifier'
  | 'avgRatingWeighted'
>;

export const sortSources = <S extends SortableSource>(sources: S[]): S[] => {
  if (!sources) return [];

  return [...sources].sort((a, b) => {
    // 1. SBD first
    const sbd = Number(b.isSoundboard) - Number(a.isSoundboard);
    if (sbd !== 0) return sbd;

    // 2. Charlie Miller (GD) / Pete Costello (JRAD) first
    const specialTaper = (t: SortableSource) =>
      /(charlie miller)|(peter costello)/i.test([t.taper, t.transferrer, t.source].join(''));
    const taper = Number(specialTaper(b)) - Number(specialTaper(a));
    if (taper !== 0) return taper;

    // 3. Higher etree ID first
    const etree = getEtreeId(b.upstreamIdentifier) - getEtreeId(a.upstreamIdentifier);
    if (etree !== 0) return etree;

    // 4. Higher weighted rating first
    return (b.avgRatingWeighted ?? 0) - (a.avgRatingWeighted ?? 0);
  });
};

export const sortTracksInSources = (sources: Source[]) => {
  for (const source of sources) {
    if (!source.sets) continue;
    source.sets.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const set of source.sets) {
      set.tracks?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
  }
};
