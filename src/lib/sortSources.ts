import { Source } from '@/types';

const getEtreeId = (s = '') =>
  Number(
    s
      .split('.')
      .reverse()
      .find((x) => /^[0-9]+$/.test(x))
  );

// tapes: TODO: GD sort (charlie miller, sbd + etree id, weighted average), sbd + etree id, weighted avg, asc, desc
// for now, hardcode sort: sbd, charlie miller, etree id, weighted average
export const sortSources = (sources: Source[]) => {
  if (!sources) return [];

  return [...sources].sort((a, b) => {
    // 1. SBD first
    const sbd = Number(b.is_soundboard) - Number(a.is_soundboard);
    if (sbd !== 0) return sbd;

    // 2. Charlie Miller (GD) / Pete Costello (JRAD) first
    const specialTaper = (t: Source) =>
      /(charlie miller)|(peter costello)/i.test([t.taper, t.transferrer, t.source].join(''));
    const taper = Number(specialTaper(b)) - Number(specialTaper(a));
    if (taper !== 0) return taper;

    // 3. Higher etree ID first
    const etree = getEtreeId(b.upstream_identifier) - getEtreeId(a.upstream_identifier);
    if (etree !== 0) return etree;

    // 4. Higher weighted rating first
    return (b.avg_rating_weighted ?? 0) - (a.avg_rating_weighted ?? 0);
  });
};
