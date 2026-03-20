import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

export async function db() {
  const { env } = await import('cloudflare:workers')
  const isDev = (env as any).DEV === 'true'
  const url = isDev ? (env as any).DEV_DATABASE_URL : (env as any).PROD_DATABASE_URL
  const sql = neon(url)
  return drizzle({ client: sql, schema })
}

export { schema }
