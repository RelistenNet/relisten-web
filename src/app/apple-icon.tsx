import { brandIconResponse } from '@/lib/brandIcon';

// Served at /apple-icon.png; timber auto-injects <link rel="apple-touch-icon">.
// iOS applies its own corner mask, so the icon stays square.
export default function AppleIcon() {
  return brandIconResponse(180, 'png');
}
