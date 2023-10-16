export const addZero = (str = ''): string => {
  const int = parseInt(str, 10);

  if (int < 10) return '0' + String(int);
  return String(int);
};

export const removeLeadingZero = (str = ''): string => {
  const int = parseInt(str, 10);

  return String(int);
};

export const createShowDate = (year: string, month: string, day: string): string => {
  return `${year}-${addZero(month)}-${addZero(day)}`;
};

export const splitShowDate = (showDate = ''): { year: string; month: string; day: string } => {
  const [year, month, day] = showDate.split('-');

  return { year, month, day };
};

// TODO: Update type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getParams = (query: string): any => {
  if (!query) {
    return {};
  }

  return (/^[?#]/.test(query) ? query.slice(1) : query).split('&').reduce((params, param) => {
    const [key, value] = param.split('=');
    params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
    return params;
  }, {});
};

export const durationToHHMMSS = (duration = 0): string => {
  const prefix = duration < 0 ? '-' : '';
  let totalSeconds = Math.abs(duration);
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60) || 0;
  const seconds = Math.floor(totalSeconds % 60) || 0;

  return (
    prefix +
    [hours, hours ? addZero(String(minutes)) : String(minutes), addZero(String(seconds))]
      .filter((x) => x)
      .join(':')
  );
};

export const simplePluralize = (str: string, count = 0): string => {
  return `${count?.toLocaleString()} ${count === 1 ? str : str + 's'}`;
};

/** example input and output:
 *
 * [ { id: 1, category: 'A' }, { id: 2, category: 'B' }, { id: 3, category: 'A' } ]
 *
 * {
 *   A: [
 *     { id: 1, category: 'A' },
 *     { id: 3, category: 'A' }
 *   ],
 *   B: [ { id: 2, category: 'B' } ]
 * }
 *
 */
export const groupBy = function (xs, key) {
  return xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};
