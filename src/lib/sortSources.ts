import { Source } from '@/types';
import { firstBy } from 'thenby';

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
  const sortedSources = sources
    ? [...sources].sort(
        firstBy((t: Source) => t.is_soundboard, 'desc')
          // Charlie for GD, Pete for JRAD
          .thenBy(
            (t: Source) =>
              /(charlie miller)|(peter costello)/i.test(
                [t.taper, t.transferrer, t.source].join('')
              ),
            'desc'
          )
          .thenBy(
            (t1: Source, t2: Source) =>
              getEtreeId(t1.upstream_identifier) - getEtreeId(t2.upstream_identifier),
            'desc'
          )
          .thenBy((t) => t.avg_rating_weighted, 'desc')
      )
    : [];

  return sortedSources;
};
