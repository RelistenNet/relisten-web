import { headers } from '@timber-js/app/server';

export function getIsInIframe(): boolean {
  const headersList = headers();
  const secFetchDest = headersList.get('sec-fetch-dest');

  return secFetchDest === 'iframe';
}
