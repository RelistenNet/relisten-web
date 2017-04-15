export const addZero = (str = '') => {
  const int = parseInt(str, 10)

  if (int < 10) return '0' + String(int);
  return String(int);
}

export const createShowDate = (year, month, day) => {
  return `${year}-${addZero(month)}-${addZero(day)}`;
}

export const splitShowDate = (showDate) => {
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
