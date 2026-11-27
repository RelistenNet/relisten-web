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

/**
 * A path on this site: one leading slash, so never another origin ("//evil.com",
 * "/\\evil.com"). Anything else parses to undefined (timber's search params never throw).
 */
const SameOriginPath = z
  .string()
  .max(2048)
  .refine((path) => /^\/(?![/\\])/.test(path));

/** `/account`, signed out: where to go back to once signed in. */
export const accountSearchParams = defineSearchParams({ return_to: SameOriginPath.optional() });

/**
 * Relisten's own sign-in page (/account), returning to `returnTo` once signed in.
 * For pages that send a signed-out visitor away on their own; a Sign In link the
 * visitor clicks can go straight to `signInHref`.
 */
export const signInPageHref = (returnTo: string) =>
  accountSearchParams.href('/account', { return_to: returnTo });
