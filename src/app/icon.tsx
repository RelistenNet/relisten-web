import { brandIconResponse } from '@/lib/brandIcon';

// Served at /icon.png; timber auto-injects <link rel="icon"> for it.
export default function Icon() {
  return brandIconResponse(256, 'png');
}
