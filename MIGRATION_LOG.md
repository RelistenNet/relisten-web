# timber.js Migration Log — relisten-web

Migration from Next.js 16.1.6 to timber.js 0.1.4.

## What Migrated Cleanly (Drop-in)

### Shimmed imports — no code changes needed
- `next/link` — all 14+ usages across components/pages work via timber shim
- `next/navigation` (`useRouter`, `usePathname`, `useParams`, `useSearchParams`, `notFound`, `redirect`, `useSelectedLayoutSegments`) — 38+ usages across the app, all shimmed
- `next/headers` (`headers()`, `cookies()`) — used in NavBar, RelistenAPI, timezone/isMobile/serverFilterCookies utils
- `next/font/google` (`Roboto`) — shimmed to timber-fonts pipeline in layout.tsx

### File conventions — same behavior
- `page.tsx` — all 28+ route pages work as-is
- `layout.tsx` — all layouts work as-is
- `error.tsx` / `global-error.tsx` — same convention, no changes needed
- `default.tsx` — parallel route fallbacks work as-is
- Dynamic routes (`[param]`, `[...slug]`, `[[...slug]]`) — same syntax
- Route groups (`(browse)`, `(embed)`, `(content)`, `(bare)`, `(stupid)`) — same syntax
- Parallel routes (`@artists`, `@years`, `@shows`, `@songs`, `@sources`) — same syntax
- `route.ts` API handlers — same GET/POST export pattern

### Libraries — framework-agnostic, no changes
- `@tanstack/react-query` + devtools
- `@reduxjs/toolkit` + `react-redux`
- Tailwind CSS v4 + PostCSS
- Framer Motion
- `nuqs` — works via `nuqs/adapters/next/app` shim
- `sonner`, `lucide-react`, `class-variance-authority`
- `ky` / `ky-universal`
- `gapless` audio player
- OpenTelemetry packages
- `@takumi-rs/image-response`

### Data fetching
- `React.cache()` wrappers in `RelistenAPI.ts` — work identically
- All static `export const metadata` — same convention

## What Needed Code Changes

### Config files (replaced)
- **`next.config.js`** → deleted, replaced with `vite.config.ts` + `timber.config.ts`
- **`tsconfig.json`** → removed Next.js plugin, removed `.next/types` from includes, removed `next-env.d.ts` from includes
- **`package.json`** → updated scripts (`next dev` → `vite`, `next build` → `vite build`), swapped deps

### Rewrites → `proxy.ts`
- `/privacy-policy` rewrite and `/discord` redirect moved from `next.config.js` to new `src/proxy.ts`

### Removed packages
| Package | Reason |
|---|---|
| `next` | Replaced by `@timber-js/app` |
| `next-redux-wrapper` | No server-side Redux hydration in timber |
| `nextjs-toploader` | Next.js-specific navigation progress bar |
| `next-zod-route` | Next.js-specific route handler wrapper |
| `@tanstack/react-query-next-experimental` | `ReactQueryStreamedHydration` is Next.js specific |

### Layout changes (`src/app/layout.tsx`)
- Removed `NextTopLoader` import and usage
- Removed unused `Link` import
- Added explicit `Metadata` type import from `@timber-js/app/server`

### Providers changes (`src/app/Providers.tsx`)
- Removed `ReactQueryStreamedHydration` wrapper (and `@tanstack/react-query-next-experimental` import)
- `NuqsAdapter` from `nuqs/adapters/next/app` kept as-is (shimmed by timber)

### Redux store (`src/redux/`)
- **`index.ts`** — removed `createWrapper` from `next-redux-wrapper`, simplified to direct `configureStore()` call
- **`modules/playback.ts`** — removed `HYDRATE` import and case from reducer
- **`modules/live.ts`** — removed `HYDRATE` import and case from reducer

### API routes
- **`src/app/api/status/route.ts`** — replaced `NextResponse` with standard `Response`
- **`src/app/api/og/route.tsx`** — removed `next-zod-route` wrapper (`createZodRoute`), replaced with direct `GET(request: Request)` handler with manual Zod parsing
- **`src/app/album-art/route.tsx`** — removed `next/og` `ImageResponse` (edge runtime), replaced with `@takumi-rs/image-response` (Node.js); removed `export const runtime = 'edge'`; removed `next-zod-route` wrapper; removed `next: { revalidate }` from font fetch calls

### Metadata functions
- `metadata()` renamed to `metadata()` in 3 files:
  - `src/app/(stupid)/[artistSlug]/[year]/[month]/page.tsx`
  - `src/app/(embed)/embed/[artistSlug]/[year]/[month]/[day]/page.tsx`
  - `src/app/(embed)/embed/[artistSlug]/[year]/[month]/[day]/[songSlug]/page.tsx`
- `Metadata` type import changed from `'next'` to `'@timber-js/app/server'`

### File renames
- `src/app/not-found.tsx` → `src/app/404.tsx`
- `src/app/(embed)/not-found.tsx` → `src/app/(embed)/404.tsx`

### Instrumentation (`src/instrumentation.ts`)
- Removed `NEXT_RUNTIME === 'nodejs'` guard (timber always runs on Node.js)

### Data fetching (`src/lib/RelistenAPI.ts`)
- Removed `next: { revalidate }` option from `ky` fetch calls (not supported outside Next.js)
- `React.cache()` wrappers retained (work identically)

### Tracing (`src/lib/tracing.ts`)
- Removed `/_next/static/` and `/_next/image` from ignore paths (Next.js-specific paths)

## Blockers / Known Issues

### Needs verification at runtime
- **`nuqs` adapter** — the `nuqs/adapters/next/app` import relies on timber's shim; needs runtime test to confirm full compatibility
- **Font loading** — `next/font/google` shim transforms at build time; need to verify Roboto weights render correctly
- **OpenTelemetry** — `src/lib/tracing.ts` initializes the Node SDK; should work but needs verification with timber's server lifecycle
- **`ky-universal`** — fetch wrapper; should work but timber's server environment may handle fetch differently

### Not migrated (out of scope)
- **Image optimization** — Next.js `next/image` was not used in this app, so no migration needed
- **ISR / static generation** — app uses `output: 'standalone'` (server mode), no static generation
- **Edge runtime** — album-art route was on edge, now moved to Node.js; may have performance implications for cold starts

## Shim Gaps Discovered

- None so far — all shimmed imports (`next/link`, `next/navigation`, `next/headers`, `next/font/google`) were sufficient for this app's usage
- `next/server` (`NextResponse`) is NOT shimmed — must use standard `Response` (documented in migration guide)
- `next/og` is NOT shimmed — must use alternative image response library (documented)

## Libraries Needing timber-Specific Adapters

- **`next-redux-wrapper`** — no timber equivalent needed; direct store creation works
- **`next-zod-route`** — no timber equivalent; replaced with manual Zod parsing of request URL
- **`nextjs-toploader`** — no timber equivalent; removed (could add custom navigation progress indicator later)
- **`@tanstack/react-query-next-experimental`** — no timber equivalent needed; TanStack Query works without it
