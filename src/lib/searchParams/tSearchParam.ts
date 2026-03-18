import { createSearchParams } from '@timber-js/app/search-params';
import type { SearchParamCodec } from '@timber-js/app/search-params';
import { formatTimeParam, parseTimeParam } from '@/lib/timeParam';

const timeCodec: SearchParamCodec<number> = {
  parse(value) {
    if (value === undefined || value === null) return 0;
    const str = Array.isArray(value) ? value[value.length - 1] : value;
    const seconds = parseTimeParam(str ?? '');
    return seconds > 0 ? seconds : 0;
  },
  serialize(value) {
    return value > 0 ? formatTimeParam(value) : null;
  },
};

export const tSearchParamsLoader = createSearchParams({
  t: timeCodec,
});
