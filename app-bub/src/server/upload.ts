import { createServerFn } from '@tanstack/react-start'
import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { items, itemTypes, projects } from '../db/schema'
import { requireAuth } from './auth-helpers'

export const uploadImage = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId?: string; fileName: string; contentType: string; base64: string }) => {
    if (!data.fileName) throw new Error('File name required')
    if (!data.contentType?.startsWith('image/')) throw new Error('Only images are supported')
    if (!data.base64) throw new Error('File data required')
    if (data.base64.length > 10 * 1024 * 1024 * 1.37) throw new Error('File too large (max 10MB)')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    const database = await db()

    // Upload to R2 first (doesn't need a project)
    const { env } = await import('cloudflare:workers')
    const timestamp = Date.now()
    const sanitized = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = data.projectId
      ? `projects/${data.projectId}/assets/${timestamp}-${sanitized}`
      : `users/${authedUser.id}/uploads/${timestamp}-${sanitized}`

    const binaryData = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))

    await (env as any).R2.put(key, binaryData, {
      httpMetadata: { contentType: data.contentType },
      customMetadata: { uploadedBy: authedUser.id },
    })

    // If project specified, create asset item
    let itemId: string | null = null
    if (data.projectId) {
      let [assetType] = await database
        .select({ id: itemTypes.id })
        .from(itemTypes)
        .where(and(eq(itemTypes.projectId, data.projectId), eq(itemTypes.slug, 'asset')))

      if (!assetType) {
        const [created] = await database.insert(itemTypes).values({
          projectId: data.projectId,
          name: 'Asset',
          slug: 'asset',
          fields: [
            { name: 'file_url', type: 'url' },
            { name: 'file_type', type: 'text' },
            { name: 'alt_text', type: 'text' },
            { name: 'size', type: 'number' },
          ],
          builtIn: true,
        }).returning({ id: itemTypes.id })
        assetType = created
      }

      const slug = `${timestamp}-${sanitized}`.toLowerCase()
      const [item] = await database.insert(items).values({
        projectId: data.projectId,
        itemTypeId: assetType.id,
        name: data.fileName,
        slug,
        data: {
          file_url: key,
          file_type: data.contentType,
          size: binaryData.length,
        },
      }).returning({ id: items.id })
      itemId = item.id
    }

    return {
      id: itemId,
      name: data.fileName,
      key,
      contentType: data.contentType,
      size: binaryData.length,
      projectId: data.projectId || null,
    }
  })
