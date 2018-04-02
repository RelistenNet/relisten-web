export const addZero = (str = '') => {
  const int = parseInt(str, 10)

  if (int < 10) return '0' + String(int);
  return String(int);
}

export const removeLeadingZero = (str = '') => {
  const int = parseInt(str, 10)

  return String(int);
}

export const createShowDate = (year, month, day) => {
  return `${year}-${addZero(month)}-${addZero(day)}`;
}

export const splitShowDate = (showDate = '') => {
  const [year, month, day] = showDate.split('-');

  return { year, month, day };
}

export const getParams = query => {
  if (!query) {
    return {};
  }

  return (/^[?#]/.test(query) ? query.slice(1) : query)
    .split('&')
    .reduce((params, param) => {
      let [ key, value ] = param.split('=');
      params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
      return params;
    }, { });
}

export const durationToHHMMSS = duration => {
  const prefix = duration < 0 ? '-' : ''
  let totalSeconds = Math.abs(duration)
  const hours = Math.floor(totalSeconds / 3600)
  totalSeconds %= 3600
  const minutes = Math.floor(totalSeconds / 60) || 0
  const seconds = Math.floor(totalSeconds % 60) || 0


  return prefix + [hours, hours ? addZero(minutes) : String(minutes), addZero(seconds)].filter(x => x).join(':')
}

export const simplePluralize = (str, count) => {
  return `${count} ${count === 1 ? str : str + 's'}`;
}

export const groupBy = function(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};
