import RelistenAPI from "@/lib/RelistenAPI";
import { deny, type MiddlewareContext } from "@timber-js/app/server";

const VALID_SEGMENT = /^[a-zA-Z0-9-]+$/;

export default async function middleware(ctx: MiddlewareContext): Promise<Response | void> {
  ctx.headers.set("Cache-Control", "private, no-cache, no-store");

  const segments = new URL(ctx.req.url).pathname.split("/").filter(Boolean);
  for (const segment of segments) {
    if (!VALID_SEGMENT.test(segment)) {
      deny(404);
    }
  }

  const artistSlug = segments[0];
  if (artistSlug) {
    const artists = await RelistenAPI.fetchAllArtists();
    if (!artists.some((a) => a.slug === artistSlug)) {
      deny(404);
    }
  }
}
