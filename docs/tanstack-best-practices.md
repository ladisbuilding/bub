# TanStack Start Best Practices

Reference patterns from `fast-tanstack` project and lessons learned.

---

## Server Functions (`createServerFn`)

### Basic Pattern (no input)

```tsx
import { createServerFn } from '@tanstack/react-start'

export const getAllDogs = createServerFn({ method: 'GET' }).handler(
  async () => {
    const database = db()
    return database.select().from(dogs).orderBy(dogs.breed)
  }
)
```

### With Input Validation (Zod)

Use `.inputValidator()` with a Zod schema - NOT `.validator()`:

```tsx
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Simple type
export const getRecentDogs = createServerFn({ method: 'GET' })
  .inputValidator(z.number())
  .handler(async ({ data: limit }) => {
    const database = db()
    return database
      .select()
      .from(dogs)
      .orderBy(desc(dogs.createdAt))
      .limit(limit)
  })

// Object type
export const getDogBySlug = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const database = db()
    const [dog] = await database
      .select()
      .from(dogs)
      .where(eq(dogs.slug, data.slug))
    return dog || null
  })
```

### Calling Server Functions

Always pass data via `{ data: value }` object:

```tsx
// In a loader or component
const dogs = await getRecentDogs({ data: 6 })

// With object validator
const dog = await getDogBySlug({ data: { slug: 'golden-retriever' } })
```

---

## Database Access

### db() Function Pattern - CRITICAL

**DO NOT** import `cloudflare:workers` at the module level in `src/db/index.ts`. This breaks client bundling even when the db() function is only called from server code.

```tsx
// src/db/index.ts - CORRECT PATTERN
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

// Use dynamic require to avoid static analysis bundling cloudflare:workers
export function db() {
  const { env } = require('cloudflare:workers') as { env: { DB: D1Database } }
  return drizzle(env.DB, { schema })
}

// Alternative: accept D1Database directly
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export { schema }
export type * from './schema'
```

**Why this works**: The `require()` call is dynamic and happens at runtime inside the function, not at module load time. Vite/Rollup doesn't try to bundle `cloudflare:workers` into the client build.

Then use it in server functions:

```tsx
const database = db()
const results = await database.select().from(users)
```

---

## Route Loaders

### Basic Loader

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  loader: async () => {
    const data = await getMyData()
    return { data }
  },
  component: Home,
})

function Home() {
  const { data } = Route.useLoaderData()
  return <div>{/* use data */}</div>
}
```

### With Auth Check (beforeLoad)

```tsx
export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/sign-in' })
    }
  },
  loader: async () => {
    // Only runs if beforeLoad passes
  },
})
```

---

## Common Gotchas

### 1. `.validator()` is deprecated
Use `.inputValidator()` with Zod schemas instead.

### 2. Data passing changed
Old: `myServerFn(value)`
New: `myServerFn({ data: value })`

### 3. Handler context
The handler receives an object with `data` property:
```tsx
.handler(async ({ data }) => {
  // data contains the validated input
})
```

### 4. Use `getRequest` not `getWebRequest`
The `getWebRequest` function is deprecated. Use `getRequest` instead:
```tsx
import { getRequest } from '@tanstack/react-start/server'

export const myServerFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    const request = getRequest()
    // use request...
  })
```

### 5. Vite allowedHosts
When using cloudflared tunnel, add your domain to vite.config.ts:
```tsx
server: {
  port: 3000,
  allowedHosts: ['dev.domfly.com'],
}
```

### 6. cloudflare:workers Import Pattern - CRITICAL

**Problem**: Vite/Rollup fails with `Rollup failed to resolve import "cloudflare:workers"` when client code transitively imports modules that use `cloudflare:workers`.

**Root Cause**: When a route file (`.tsx`) imports from a utility module that imports `@/db` or `cloudflare:workers`, the entire import chain gets bundled for both client AND server. The client build fails because it can't resolve the Cloudflare virtual import.

---

#### The Golden Rule: Separate Server and Client Code

**Server-only code** (can import `cloudflare:workers` and `@/db`):
- Files in `src/server/*.ts`
- API route handlers
- `createServerFn` handlers

**Client-safe code** (NO `cloudflare:workers` or `@/db` imports):
- Route components (`src/routes/*.tsx`)
- UI components (`src/components/*.tsx`)
- Utility modules imported by components (`src/utils/*.ts`)
- Hooks (`src/hooks/*.ts`)

---

#### Proper File Structure

```
src/
├── server/           # Server-only - can import cloudflare:workers
│   ├── auth.ts       # requireAuth, requireOT, getCurrentUser, signOutUser
│   ├── sign-in.ts    # signIn server function
│   ├── create-account.ts
│   ├── users.ts
│   └── ...
├── utils/            # Client-safe - NO cloudflare:workers imports
│   ├── auth.ts       # AuthUser type, route guards (requireClientRole, etc.)
│   ├── cookies.ts
│   ├── validation.ts
│   └── ...
├── routes/           # Route components - import server fns, not db
│   ├── sign-in.tsx
│   └── ...
└── db/
    └── index.ts      # db() function - server-only
```

---

#### Example: Auth Utilities Split

**BAD - Single file with mixed concerns:**
```tsx
// src/utils/auth.ts - BROKEN: client code imports this, pulls in db
import { db } from '@/db'  // This breaks client builds!
import { users } from '@/db/schema'

export interface AuthUser { ... }  // Types are fine

export async function requireAuth(request: Request, env: AuthEnv) {
  const database = db()  // Uses cloudflare:workers via db()
  // ...
}

export function requireClientRole({ context }) {  // Route guard - client-safe
  if (!context.user) throw redirect({ to: '/' })
}
```

**GOOD - Split into server and client modules:**

```tsx
// src/utils/auth.ts - Client-safe, NO db imports
import { redirect } from '@tanstack/react-router'

export interface AuthUser { ... }
export interface AuthEnv { ... }

// Route guards - used in beforeLoad, run on both client and server
export function requireClientRole({ context }) {
  if (!context.user) throw redirect({ to: '/' })
}
export function requireOTRole({ context }) { ... }
```

```tsx
// src/server/auth.ts - Server-only, can use cloudflare:workers
import { db } from '@/db'
import { users } from '@/db/schema'
import type { AuthUser, AuthEnv } from '@/utils/auth'
import { env } from 'cloudflare:workers'

export async function requireAuth(request: Request, authEnv: AuthEnv) {
  const database = db()
  // ...
}

export const signOutUser = createServerFn({ method: 'POST' })
  .handler(async () => {
    // Can use env, db(), etc.
  })
```

---

#### Example: Route with Server Function

**BAD - Inline server function in route file:**
```tsx
// src/routes/sign-in.tsx - BROKEN
import { db } from '@/db'  // Breaks client build!
import { env } from 'cloudflare:workers'  // Breaks client build!

const signIn = createServerFn({ method: 'POST' })
  .handler(async (ctx) => {
    const database = db()  // Even in createServerFn, the import is module-level
    // ...
  })

export const Route = createFileRoute('/sign-in')({ ... })
```

**GOOD - Server function in dedicated server file:**
```tsx
// src/server/sign-in.ts
import { db } from '@/db'
import { env } from 'cloudflare:workers'

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator(signInSchema)
  .handler(async (ctx) => {
    const database = db()
    // ...
  })
```

```tsx
// src/routes/sign-in.tsx - Clean, no server imports
import { signIn } from '@/server/sign-in'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  const onSubmit = async () => {
    await signIn({ data: { email, password } })
  }
  // ...
}
```

---

#### Quick Checklist

When you get `Rollup failed to resolve import "cloudflare:workers"`:

1. **Find the import chain**: What route/component is importing what utility that imports `@/db`?
2. **Check your route files**: Do any `.tsx` routes have inline `createServerFn` with `cloudflare:workers` or `@/db` imports?
3. **Check your utils**: Do files in `src/utils/` import from `@/db`? They shouldn't.
4. **Move server code**: Server functions and DB-accessing code go in `src/server/`
5. **Keep utils clean**: `src/utils/` should only have types, pure functions, and client-safe utilities

---

#### The Golden Rule: Only Export `createServerFn` from Server Files

**Rule: Files that export `createServerFn` should ONLY export `createServerFn` functions.**

Why? TanStack transforms `createServerFn` exports into RPC stubs for the client. But if your file has **other exports** (regular functions, constants that use server imports), those are kept along with **all their imports**.

```tsx
// src/server/r2-presign.ts - THIS BREAKS

import { env } from 'cloudflare:workers'  // Server-only import

// This gets transformed to RPC stub on client ✓
export const getPresignedUploadUrl = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => { /* uses env */ })

// This is a regular EXPORTED function - NOT transformed ✗
// Causes TanStack to keep all imports including cloudflare:workers
export async function generatePresignedPutUrl(key: string) {
  // uses env...
}
```

**Solution**: Move regular functions to a separate server-only file that's never imported by routes.

---

#### Private Helper Functions Are Fine

Non-exported helper functions inside server files get stripped along with the handler:

```tsx
// src/server/r2-presign.ts - THIS WORKS

import { env } from 'cloudflare:workers'

// Private helper - NOT exported, only used inside createServerFn handlers
async function getAvailableFilename(filename: string, prefix: string) {
  // Uses server-only code - this is fine
  return availableFilename
}

// This gets transformed, and the private helper is stripped along with it
export const getPresignedUploadUrl = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const available = await getAvailableFilename(data.filename, data.prefix)
    // ...
  })
```

Key distinction:
- **Exported** non-server functions → Kept in client bundle (BREAKS)
- **Private** helper functions → Stripped with the handler (WORKS)

---

#### Dynamic Import Alternative (for rare cases)

If you need Cloudflare bindings in a mixed module:
```tsx
export const myServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { env } = await import('cloudflare:workers')
    return env.API_KEY
  })
```

---

#### Debugging: Verify Transformation Worked

To see what Vite sends to the client, curl the module directly:

```bash
# Start dev server
npm run dev

# Check what the client receives for a server file
curl http://localhost:3000/src/server/r2-presign.ts
```

If you see `cloudflare:workers` in the output, the file has non-server-function exports keeping the imports.

A properly transformed file looks like:

```javascript
import { createClientRpc } from "@tanstack/react-start/client-rpc";
import { createServerFn } from "@tanstack/react-start";

export const getPresignedUploadUrl = createServerFn({
  method: "POST"
}).handler(createClientRpc("encoded-reference"));
```

No `cloudflare:workers`, no `AwsClient`, no server-only code - just the RPC stub.
