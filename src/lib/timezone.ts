import 'server-only';

import { TZDate } from '@date-fns/tz';
import { getHeaders } from '@timber-js/app/server';
import { format } from 'date-fns';

export const getCurrentMonthDay = async () => {
  const h = await getHeaders();

  const timezone = String(h.get('cf-timezone') ?? 'America/New_York');

  const date = new TZDate(new Date(), timezone);

  const [month, day] = format(date, 'MM-dd').split('-');

  return { month, day, date };
};
