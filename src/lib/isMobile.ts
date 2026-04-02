import { getHeaders } from '@timber-js/app/server';
import { UAParser } from 'ua-parser-js';

export const isMobile = async () => {
  const headersList = await getHeaders();
  const userAgent = headersList.get('user-agent');

  if (!userAgent) return false;

  const result = UAParser(userAgent);

  return result.device.type === 'mobile' || result.device.type === 'tablet';
};
