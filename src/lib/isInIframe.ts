import { headers } from 'next/headers';

export function getIsInIframe(): Promise<boolean> {
  return headers().then((headersList) => {
    const secFetchDest = headersList.get('sec-fetch-dest');
    return !!secFetchDest;
  });
}
