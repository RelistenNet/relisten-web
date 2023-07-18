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

export const durationToHHMMSS = (duration: number): string => {
  const prefix = duration < 0 ? '-' : '';
  let totalSeconds = Math.abs(duration);
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60) || 0;
  const seconds = Math.floor(totalSeconds % 60) || 0;

  return (
    prefix +
    [String(hours), hours ? addZero(String(minutes)) : String(minutes), addZero(String(seconds))]
      .filter((x) => x)
      .join(':')
  );
};

export const simplePluralize = (str: string, count: number): string => {
  return `${count} ${count === 1 ? str : str + 's'}`;
};

export const groupBy = function (xs, key) {
  return xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};
