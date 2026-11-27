import { href } from '@timber-js/app/routes';
import { redirect } from '@timber-js/app/server';

// The Live page's old address; keeps old links working.
export default function RecentlyPlayedRedirect() {
  redirect(href('/live'), { permanent: true });
}
