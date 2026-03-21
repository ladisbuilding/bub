import { redirect } from '@tanstack/react-router'
import { getCurrentUser } from '../server/auth'

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw redirect({ to: '/sign-in' })
  return { user }
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw redirect({ to: '/' })
  return { user }
}
