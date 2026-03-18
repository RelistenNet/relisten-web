import { headers } from '@timber-js/app/server';
import { UAParser } from 'ua-parser-js';

export const isMobile = () => {
  const headersList = headers();
  const userAgent = headersList.get('user-agent');

  if (!userAgent) return false;

  const result = UAParser(userAgent);

  return result.device.type === 'mobile' || result.device.type === 'tablet';
};
