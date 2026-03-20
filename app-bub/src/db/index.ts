import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

export async function db() {
  const { env } = await import('cloudflare:workers')
  const sql = neon((env as any).DATABASE_URL)
  return drizzle({ client: sql, schema })
}

export { schema }
