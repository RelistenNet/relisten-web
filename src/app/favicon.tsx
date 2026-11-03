import { brandIconResponse } from '@/lib/brandIcon';

// Served at /favicon.ico for clients that request it directly (no auto <link>).
export default function Favicon() {
  return brandIconResponse(48, 'ico');
}
