import { createServerFn } from '@tanstack/react-start'
import { setCookie, getCookie, deleteCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { hashPassword, verifyPassword } from '../lib/password'
import { createToken, verifyToken } from './auth-helpers'

function setAuthCookie(token: string) {
  setCookie('auth', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
}

export const getCurrentUser = createServerFn({ method: 'GET' })
  .handler(async () => {
    const token = getCookie('auth')
    if (!token) return null
    const user = await verifyToken(token)
    if (!user) return null

    const database = await db()
    const [row] = await database
      .select({ aiProvider: users.aiProvider, aiModel: users.aiModel, aiApiKey: users.aiApiKey })
      .from(users)
      .where(eq(users.id, user.id))

    return {
      ...user,
      aiProvider: row?.aiProvider ?? null,
      aiModel: row?.aiModel ?? null,
      hasApiKey: Boolean(row?.aiApiKey),
    }
  })

export const createAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => {
    if (!data.email || !data.password) throw new Error('Email and password are required')
    if (data.password.length < 8) throw new Error('Password must be at least 8 characters')
    return data
  })
  .handler(async ({ data }) => {
    const database = await db()

    const existing = await database.select({ id: users.id }).from(users).where(eq(users.email, data.email))
    if (existing.length > 0) throw new Error('An account with this email already exists')

    const passwordHash = await hashPassword(data.password)

    const [user] = await database.insert(users).values({
      email: data.email,
      passwordHash,
    }).returning({ id: users.id, email: users.email })

    const token = await createToken(user)
    setAuthCookie(token)
    return { id: user.id, email: user.email }
  })

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => {
    if (!data.email || !data.password) throw new Error('Email and password are required')
    return data
  })
  .handler(async ({ data }) => {
    const database = await db()

    const [user] = await database.select().from(users).where(eq(users.email, data.email))
    if (!user) throw new Error('Invalid email or password')

    const valid = await verifyPassword(data.password, user.passwordHash)
    if (!valid) throw new Error('Invalid email or password')

    const token = await createToken({ id: user.id, email: user.email })
    setAuthCookie(token)
    return { id: user.id, email: user.email }
  })

export const signOut = createServerFn({ method: 'POST' })
  .handler(async () => {
    deleteCookie('auth')
  })
