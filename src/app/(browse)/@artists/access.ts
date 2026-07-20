import { getHeaders, deny } from '@timber-js/app/server';

export default async function access() {
  const headers = await getHeaders();
  if (headers.get('sec-fetch-dest') === 'iframe') {
    deny(404);
  }
}
