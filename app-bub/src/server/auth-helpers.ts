import { getCookie } from '@tanstack/react-start/server'

async function getJwtSecret() {
  const { env } = await import('cloudflare:workers')
  const isDev = (env as any).DEV === 'true'
  return (isDev ? (env as any).DEV_JWT_SECRET : (env as any).PROD_JWT_SECRET) as string
}

export async function createToken(payload: { id: string; email: string }): Promise<string> {
  const secret = await getJwtSecret()
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  return `${header}.${body}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`
}

export async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const secret = await getJwtSecret()
    const [header, body, sig] = token.split('.')
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(`${header}.${body}`))
    if (!valid) return null
    const payload = JSON.parse(atob(body))
    if (payload.exp < Date.now()) return null
    return { id: payload.id, email: payload.email }
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<{ id: string; email: string }> {
  const token = getCookie('auth')
  if (!token) throw new Error('Not authenticated')
  const user = await verifyToken(token)
  if (!user) throw new Error('Not authenticated')
  return user
}
