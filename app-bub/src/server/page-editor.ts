import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { items, itemTypes, projects } from '../db/schema'
import { COMPONENT_DEFAULTS } from '../lib/component-config'

interface Component {
  type: string
  props: Record<string, any>
}

export async function getPageComponents(projectId: string): Promise<{ itemId: string; components: Component[] }> {
  const database = await db()

  const [pageType] = await database
    .select({ id: itemTypes.id })
    .from(itemTypes)
    .where(and(eq(itemTypes.projectId, projectId), eq(itemTypes.slug, 'page')))

  if (!pageType) return { itemId: '', components: [] }

  const [homePage] = await database
    .select({ id: items.id, data: items.data })
    .from(items)
    .where(and(eq(items.projectId, projectId), eq(items.itemTypeId, pageType.id), eq(items.slug, 'home')))

  if (!homePage) return { itemId: '', components: [] }

  return {
    itemId: homePage.id,
    components: (homePage.data as any)?.components || [],
  }
}

export async function updatePageComponents(itemId: string, components: Component[]): Promise<void> {
  const database = await db()
  await database.update(items).set({
    data: { components },
    updatedAt: new Date(),
  }).where(eq(items.id, itemId))
}

export async function addComponent(projectId: string, component: Component): Promise<Component[]> {
  const { itemId, components } = await getPageComponents(projectId)
  if (!itemId) throw new Error('No homepage found')

  components.push(component)
  await updatePageComponents(itemId, components)
  return components
}

export async function editComponent(projectId: string, targetType: string, changes: Record<string, any>): Promise<Component[]> {
  const { itemId, components } = await getPageComponents(projectId)
  if (!itemId) throw new Error('No homepage found')

  const idx = components.findIndex((c) => c.type === targetType)
  if (idx === -1) throw new Error(`Component "${targetType}" not found`)

  // Merge changes into props
  components[idx] = {
    ...components[idx],
    props: {
      ...components[idx].props,
      ...changes,
      style: { ...components[idx].props?.style, ...changes?.style },
    },
  }
  await updatePageComponents(itemId, components)
  return components
}

export async function removeComponent(projectId: string, targetType: string): Promise<Component[]> {
  const { itemId, components } = await getPageComponents(projectId)
  if (!itemId) throw new Error('No homepage found')

  const filtered = components.filter((c) => c.type !== targetType)
  if (filtered.length === components.length) throw new Error(`Component "${targetType}" not found`)

  await updatePageComponents(itemId, filtered)
  return filtered
}

export async function resetComponent(projectId: string, targetType: string, projectName?: string): Promise<Component[]> {
  const { itemId, components } = await getPageComponents(projectId)
  if (!itemId) throw new Error('No homepage found')

  const idx = components.findIndex((c) => c.type === targetType)
  if (idx === -1) throw new Error(`Component "${targetType}" not found`)

  const defaults = COMPONENT_DEFAULTS[targetType] || {}
  // Keep the title as the project name for hero
  if (targetType === 'hero' && projectName) {
    defaults.title = projectName
  }
  components[idx] = { type: targetType, props: { ...defaults } }
  await updatePageComponents(itemId, components)
  return components
}

export async function renameProject(projectId: string, newName: string): Promise<void> {
  const database = await db()
  await database.update(projects).set({
    name: newName,
    updatedAt: new Date(),
  }).where(eq(projects.id, projectId))

  // Also update hero title if it exists
  const { itemId, components } = await getPageComponents(projectId)
  if (itemId) {
    const heroIdx = components.findIndex((c) => c.type === 'hero')
    if (heroIdx >= 0) {
      components[heroIdx].props.title = newName
      await updatePageComponents(itemId, components)
    }
  }
}
