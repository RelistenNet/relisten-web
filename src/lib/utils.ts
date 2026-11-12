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

export const createShowDate = (year?: string, month?: string, day?: string): string => {
  return `${year ?? ''}-${addZero(month ?? '')}-${addZero(day ?? '')}`;
};

export const splitShowDate = (showDate = ''): { year: string; month: string; day: string } => {
  const [year, month, day] = showDate.split('-');

  return { year, month, day };
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

// One shared formatter: `Number#toLocaleString()` builds a new Intl.NumberFormat
// on every call (~17µs vs ~0.4µs), and list columns call this hundreds of times
// per render. Same default locale as `toLocaleString()`.
export const numberFormat = new Intl.NumberFormat();

export const simplePluralize = (str: string, count = 0): string => {
  return `${numberFormat.format(count ?? 0)} ${count === 1 ? str : str + 's'}`;
};

export const splitPluralize = (str: string, count = 0): [string, string] => {
  return [numberFormat.format(count ?? 0), count === 1 ? str : str + 's'];
};
