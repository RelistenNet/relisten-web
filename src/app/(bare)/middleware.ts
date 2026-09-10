import type { MiddlewareContext } from '@timber-js/app/server';
import { refreshSessionIfNeeded } from '@/lib/refreshSession';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/constants';

// This route group's layout renders NavBar -> AccountMenu, so its session cookie needs to be
// fresh before render — see refreshSession.ts for why this can't happen reactively during render.
export default async function middleware(_ctx: MiddlewareContext): Promise<Response | void> {
  if (ACCOUNTS_FEATURE_ENABLED) await refreshSessionIfNeeded();
}
