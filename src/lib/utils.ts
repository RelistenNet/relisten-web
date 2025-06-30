export const addZero = (str = ''): string => {
  const int = parseInt(str, 10);

  // 'XX' should return 'XX'
  if (isNaN(int)) return str;

  if (int < 10) return '0' + String(int);

  return String(int);
};

export const removeLeadingZero = (str = ''): string => {
  const int = parseInt(str, 10);

  if (isNaN(int)) return str;

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

export const groupBy = function <T>(xs: T[], key: keyof T): Record<string, T[]> {
  return xs.reduce(
    (rv, x) => {
      const keyValue = String(x[key]);
      (rv[keyValue] = rv[keyValue] || []).push(x);
      return rv;
    },
    {} as Record<string, T[]>
  );
};
