import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projects } from '../db/schema'
import { requireAuth } from './auth-helpers'

export const addCustomDomain = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string; domain: string }) => {
    if (!data.projectId) throw new Error('Project ID required')
    if (!data.domain) throw new Error('Domain required')
    // Basic domain validation
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(data.domain)) throw new Error('Invalid domain format')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    const database = await db()

    const [project] = await database
      .select()
      .from(projects)
      .where(eq(projects.id, data.projectId))

    if (!project || project.userId !== authedUser.id) throw new Error('Project not found')

    const { env } = await import('cloudflare:workers')
    const cfToken = (env as any).CF_API_TOKEN
    const zoneId = (env as any).CF_ZONE_ID

    if (!cfToken || !zoneId) throw new Error('Custom domains not configured')

    // Register custom hostname with Cloudflare for SaaS
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostname: data.domain,
        ssl: {
          method: 'http',
          type: 'dv',
          settings: { min_tls_version: '1.2' },
        },
      }),
    })

    const result = await res.json() as any

    if (!result.success) {
      throw new Error(result.errors?.[0]?.message || 'Failed to add custom domain')
    }

    // Save custom domain to project
    await database.update(projects).set({
      customDomain: data.domain,
      updatedAt: new Date(),
    }).where(eq(projects.id, data.projectId))

    return {
      domain: data.domain,
      status: result.result?.ssl?.status || 'pending',
      verificationCname: 'domain.bub.ai',
    }
  })

export const removeCustomDomain = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string }) => {
    if (!data.projectId) throw new Error('Project ID required')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    const database = await db()

    const [project] = await database
      .select()
      .from(projects)
      .where(eq(projects.id, data.projectId))

    if (!project || project.userId !== authedUser.id) throw new Error('Project not found')
    if (!project.customDomain) throw new Error('No custom domain configured')

    const { env } = await import('cloudflare:workers')
    const cfToken = (env as any).CF_API_TOKEN
    const zoneId = (env as any).CF_ZONE_ID

    if (cfToken && zoneId) {
      // Find and delete the custom hostname
      const listRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${project.customDomain}`, {
        headers: { Authorization: `Bearer ${cfToken}` },
      })
      const listResult = await listRes.json() as any
      if (listResult.success && listResult.result?.length > 0) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${listResult.result[0].id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${cfToken}` },
        })
      }
    }

    await database.update(projects).set({
      customDomain: null,
      updatedAt: new Date(),
    }).where(eq(projects.id, data.projectId))

    return { success: true }
  })
