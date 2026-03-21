import { createServerFn } from '@tanstack/react-start'
import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { projects, itemTypes, items } from '../db/schema'
import { requireAuth } from './auth-helpers'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const BUILT_IN_TYPES = [
  {
    name: 'Page',
    slug: 'page',
    fields: [{ name: 'components', type: 'json' }],
  },
  {
    name: 'Menu',
    slug: 'menu',
    fields: [{ name: 'position', type: 'select', options: ['header', 'footer'] }],
  },
  {
    name: 'Menu Item',
    slug: 'menu-item',
    fields: [
      { name: 'label', type: 'text' },
      { name: 'url', type: 'text' },
    ],
  },
]

export const createProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; description?: string }) => {
    if (!data.name) throw new Error('Project name is required')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    const database = await db()

    // Check for existing project with same name
    const [existing] = await database
      .select()
      .from(projects)
      .where(and(eq(projects.userId, authedUser.id), eq(projects.name, data.name)))

    if (existing) return existing

    const slug = slugify(data.name) + '-' + crypto.randomUUID().slice(0, 6)

    const [project] = await database.insert(projects).values({
      userId: authedUser.id,
      name: data.name,
      slug,
      description: data.description || null,
      status: 'live',
    }).returning()

    // Create built-in item types
    const createdTypes: Record<string, string> = {}
    for (const type of BUILT_IN_TYPES) {
      const [created] = await database.insert(itemTypes).values({
        projectId: project.id,
        name: type.name,
        slug: type.slug,
        fields: type.fields,
        builtIn: true,
      }).returning({ id: itemTypes.id })
      createdTypes[type.slug] = created.id
    }

    // Create default homepage
    await database.insert(items).values({
      projectId: project.id,
      itemTypeId: createdTypes['page'],
      name: 'Home',
      slug: 'home',
      data: {
        components: [
          {
            type: 'hero',
            props: {
              title: data.name,
              style: { bgColor: '#ffffff', textColor: '#000000', height: '100vh' },
            },
          },
        ],
      },
      sortOrder: 0,
    })

    return project
  })

export const getProjects = createServerFn({ method: 'GET' })
  .handler(async () => {
    const authedUser = await requireAuth()
    const database = await db()

    return database
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        status: projects.status,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.userId, authedUser.id))
  })

export const getProject = createServerFn({ method: 'GET' })
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

    return project
  })

export const publishProject = createServerFn({ method: 'POST' })
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

    // Set status to published
    await database.update(projects).set({
      status: 'published',
      updatedAt: new Date(),
    }).where(eq(projects.id, data.projectId))

    // Set up custom domain via Cloudflare Workers API
    try {
      const { env } = await import('cloudflare:workers')
      const cfToken = (env as any).CF_API_TOKEN
      const cfAccountId = (env as any).CF_ACCOUNT_ID
      if (cfToken && cfAccountId) {
        await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/domains`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hostname: `${project.slug}.bub.ai`,
            service: 'app-bub',
            environment: 'production',
          }),
        })
      }
    } catch {
      // Domain setup failed — site is still published, just not on custom subdomain yet
    }

    return { slug: project.slug, url: `https://${project.slug}.bub.ai` }
  })
