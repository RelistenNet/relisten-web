import { defineSearchParams } from '@timber-js/app/search-params';
import { z } from 'zod/v4';

/**
 * `return_to` on the User Service's browser-session routes. Those paths are served
 * same-origin by Traefik, the preview gateway or `pnpm dev:session`, not by timber
 * routes, so `href()` can't type them; the query still goes through this definition.
 */
export const sessionReturnSearchParams = defineSearchParams({ return_to: z.string() });

/** Same-origin entry point for sign-in; safe to use as a plain <a href>. */
export const signInHref = (returnTo: string) =>
  sessionReturnSearchParams.href('/auth/session/start', { return_to: returnTo });
