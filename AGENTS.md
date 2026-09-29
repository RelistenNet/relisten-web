# timber.js — AI Agent Skill

Use this skill when building, modifying, or debugging a timber.js application. timber.js is a Vite-native React framework with file-system routing, React Server Components, and real HTTP status codes.

timber.js is inspired by, but is NOT Next.js. Do not assume Next.js features, APIs, or conventions work in timber. The routing structure is similar, but the APIs, rendering model, and conventions diverge significantly. Always consult timber docs, not Next.js docs.

Full documentation is available in `node_modules/@timber-js/app/docs/` (MDX files). Read the relevant doc before implementing a feature. This skill covers the essential patterns — the docs go deeper.

## Project structure

```
app/
  layout.tsx        # Root layout (required) — wraps all pages
  page.tsx          # Home page (/)
  globals.css       # Global styles
  about/
    page.tsx        # /about
  blog/
    layout.tsx      # Blog layout — wraps blog pages
    page.tsx        # /blog
    [slug]/
      page.tsx      # /blog/:slug
timber.config.ts    # Framework config (output mode, adapter, cache)
vite.config.ts      # Vite config — imports timber()
tsconfig.json
```

## Segment convention files

Each directory in `app/` is a **segment**. These files have special meaning:

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `page.tsx`      | Route leaf — renders at this URL                              |
| `layout.tsx`    | Persistent shell — wraps children, survives client navigation |
| `access.ts`     | Auth gate — runs inside React tree, supports slot degradation |
| `middleware.ts` | Pre-render hook — headers, redirects, cache warming           |
| `schema.ts`     | Segment & search param codecs                                 |
| `error.tsx`     | Error boundary for this subtree                               |
| `404.tsx`       | Custom 404 page (must be a client component)                  |

There is NO `loading.tsx`. Use `<Suspense>` with the flush point model instead.

## Key imports

```ts
// Server (server components, middleware, access, actions)
import { deny, redirect, getHeaders, getCookieJar, getSegmentParams,
         createActionClient, ActionError, revalidatePath, revalidateTag,
         waitUntil, getTraceId, withSpan } from '@timber-js/app/server';

// Client (client components)
import { Link, useRouter, usePathname, useActionState,
         useSegmentParams, usePendingNavigation, useLinkStatus,
         useSelectedLayoutSegment } from '@timber-js/app/client';

// Typed params
import { defineSchema } from '@timber-js/app/params';
import { codec } from '@timber-js/app/codec';
import { defineSearchParams } from '@timber-js/app/search-params';
import { defineCookie } from '@timber-js/app/cookies';

// Caching
import { cache } from '@timber-js/app/cache';

// Generated segment module (typed params, segment path)
import { SEGMENT_PATH } from './$segment';
```

## Pages and layouts

Pages are server components by default — async, server-only, zero client JS:

```tsx
// app/products/[id]/page.tsx
import { SEGMENT_PATH } from './$segment';
import { deny, getSegmentParams } from '@timber-js/app/server';

export default async function ProductPage() {
  const { id } = getSegmentParams(SEGMENT_PATH);
  const product = await db.products.find(id);
  if (!product) return deny(404); // Real HTTP 404
  return <h1>{product.name}</h1>;
}
```

Layouts receive `{ children }` and persist across navigation:

```tsx
// app/layout.tsx — root layout (required)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

## Server and client components

**Server components** (default): async, access secrets/DB, zero client JS cost.
**Client components** (`'use client'`): `useState`, `useEffect`, event handlers, browser APIs.

```tsx
// app/counter.tsx
'use client';
import { useState } from 'react';
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

Server components can render client components as children. Client components cannot import server components (pass them as `children` or props instead).

## deny() and redirect()

`deny()` produces real HTTP status codes. `redirect()` sends HTTP redirects.

```ts
deny();           // 403 (default)
deny(404);        // 404 Not Found
deny(503, data);  // 503 with data for error boundary

redirect('/login');                     // 307 temporary
redirect('/new-page', { permanent: true }); // 308 permanent
```

## Forms and server actions

Actions use `createActionClient` for reusable middleware:

```ts
// lib/action.ts
'use server';
import { createActionClient, ActionError } from '@timber-js/app/server';

export const actionClient = createActionClient({
  middleware: async () => {
    const user = await getUser();
    if (!user) throw new ActionError('UNAUTHORIZED');
    return { user };
  },
});
```

```ts
// app/todos/actions.ts
'use server';
import { z } from 'zod/v4';
import { action } from '@/lib/action';
import { revalidatePath } from '@timber-js/app/server';

export const createTodo = actionClient
  .schema(z.object({ title: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    await db.todos.create({ ...input, userId: ctx.user.id });
    return revalidatePath('/todos');
  });
```

```tsx
// app/todos/todo-form.tsx
'use client';
import { useActionState } from '@timber-js/app/client';
import { createTodo } from './actions';

export function TodoForm() {
  const [state, formAction, pending, errors] = useActionState(createTodo, null);
  return (
    <form action={formAction}>
      <input name="title" required />
      {errors.getFieldError('title') && <p>{errors.getFieldError('title')}</p>}
      <button disabled={pending}>{pending ? 'Adding...' : 'Add'}</button>
    </form>
  );
}
```

Forms work without JavaScript — they submit as standard POST. With JS, `useActionState` enhances with pending state.

## Access control (access.ts)

```ts
// app/(authenticated)/access.ts
import { getCookieJar, redirect } from '@timber-js/app/server';

export default async function access() {
  const session = getSession(getCookieJar());
  if (!session) return redirect('/login');
}
```

Access runs inside the React tree. It shares `React.cache` scope with layouts. For parallel routes (slots), denied slots degrade gracefully while the rest of the page renders.

## Middleware

Two layers: `proxy.ts` (global, has `next()`) and `middleware.ts` (per-segment, no `next()`).

```ts
// app/dashboard/middleware.ts
import { redirect } from '@timber-js/app/server';
import type { MiddlewareContext } from '@timber-js/app/server';

export default async function middleware(ctx: MiddlewareContext) {
  const session = await getSession(ctx.req);
  if (!session) redirect('/login');
  ctx.headers.set('x-custom', 'value'); // Set response headers
}
```

Use middleware for headers, redirects, cache warming. Use `access.ts` for auth.

## Typed params

Define codecs in `app/schema.ts`:

```ts
// app/schema.ts
import { defineSchema } from '@timber-js/app/params';
import { codec } from '@timber-js/app/codec';

export default defineSchema({
  segmentParams: {
    '[id]': codec.integer,
    '[slug]': codec.string,
  },
});
```

## Search params

```ts
// app/products/search-params.ts
import { defineSearchParams } from '@timber-js/app/search-params';
import { codec } from '@timber-js/app/codec';

export const { searchParams } = defineSearchParams({
  q: codec.string.optional,
  page: codec.integer.default(1),
});
```

Server: `searchParams.get()`. Client: `searchParams.useQueryStates()`.

## Caching

No implicit caching. `fetch()` is never patched. Use `timber.cache()` for cross-request caching:

```ts
import { cache } from '@timber-js/app/cache';

const getProducts = cache(
  async () => db.products.findMany(),
  { ttl: 60, tags: ['products'] }
);
```

Use `React.cache` for single-request deduplication.

## The flush point

timber holds the HTTP response until the shell (everything outside `<Suspense>`) resolves. This means:

- Data fetched outside `<Suspense>` can affect the status code (`deny(404)` works)
- Data inside `<Suspense>` streams after the shell flushes
- There is no `loading.tsx` — use `<Suspense>` with a fallback explicitly

## Configuration

```ts
// timber.config.ts
import { cloudflare } from '@timber-js/app/adapters/cloudflare';

export default {
  output: 'server',        // or 'static'
  adapter: cloudflare(),   // or nitro({ preset: 'node-server' })
};
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { timber } from '@timber-js/app';

export default defineConfig({
  plugins: [timber()],
});
```

## Client navigation

```tsx
import { Link } from '@timber-js/app/client';

<Link href="/about">About</Link>
<Link href="/products/123" prefetch>Product</Link>
```

```tsx
const router = useRouter();
router.push('/dashboard');
router.replace('/settings');
router.refresh();
```

## Route patterns

- `(group)/` — route group (no URL segment)
- `_private/` — excluded from routing
- `[param]/` — dynamic segment
- `[...catchAll]/` — catch-all segment
- `@slot/` — parallel route (named slot)
- `(.)path/` — intercepting route

## Common mistakes to avoid

1. **No `loading.tsx`** — timber doesn't have it. Use `<Suspense>` explicitly.
2. **Don't patch fetch** — `fetch()` is never cached. Use `timber.cache()` or `React.cache`.
3. **`deny()` not `throw new Error`** — use `deny(404)` for proper status codes, not error throwing.
4. **Server actions need `'use server'`** — at the top of the file or the function.
5. **`access.ts` exports a default function** — not a named export.
6. **Root layout must include `<html>` and `<body>`** — timber doesn't add these.
7. **`getSegmentParams` uses ALS** — works in server components, middleware, access, actions. No prop drilling needed.
8. **`useActionState` returns 4 values** — `[state, formAction, isPending, errors]`. The 4th is timber-specific with `errors.getFieldError()`, `errors.fieldErrors`, `errors.serverError`.
9. **Middleware has one arg** — `middleware(ctx: MiddlewareContext)`, not `(req, res)`.
10. **Don't use `next/` imports** — use `@timber-js/app/server`, `@timber-js/app/client`, etc.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
```

Before editing a file, `npx timber graph <file> --json` answers which environment(s) it runs in (server / client-boundary / client-internal / shared), its import chains, and any server-only/client-only conflicts. First query per project state runs a crawl (seconds); subsequent queries hit a cache (milliseconds).

## Further reading

Full docs are in `node_modules/@timber-js/app/docs/`. Key files:

- `docs/learn/` — Core concepts (pages, data fetching, forms, caching, middleware)
- `docs/more/` — Advanced topics (routing, metadata, MDX, content collections, security)
- `docs/api/` — API reference for every export
