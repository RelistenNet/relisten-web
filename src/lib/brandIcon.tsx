/* oxlint-disable react/no-unknown-property */
import 'server-only';

import { ImageResponse } from 'takumi-js/response';

const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800';

/** The "Re" app icon, rendered square at `size` px. Shared by icon.tsx and favicon.tsx. */
export function brandIconResponse(size: number, format: 'png' | 'ico') {
  return new ImageResponse(
    <div
      tw="flex h-full w-full items-center justify-center text-white font-bold"
      style={{
        // --primary / relisten-600 in globals.css
        background: '#009DC1',
        fontSize: size * 0.65,
        letterSpacing: `-${size * 0.01}px`,
        paddingBottom: size * 0.02,
      }}
    >
      Re
    </div>,
    {
      width: size,
      height: size,
      // takumi's `format` is a tagged union, so a `'png' | 'ico'` value doesn't narrow.
      ...(format === 'ico' ? { format: 'ico' as const } : { format: 'png' as const }),
      headers: { 'Cache-Control': CACHE_CONTROL },
    }
  );
}
