import { getHeaders } from '@timber-js/app/server';

export async function getIsInIframe(): Promise<boolean> {
  const headersList = await getHeaders();
  const secFetchDest = headersList.get('sec-fetch-dest');

  return secFetchDest === 'iframe';
}
