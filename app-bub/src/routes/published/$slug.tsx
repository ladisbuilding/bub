import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { renderComponent } from '../../components/SiteComponents'

const getPublishedSite = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { db } = await import('../../db')
    const { projects } = await import('../../db/schema')
    const { getPageComponents } = await import('../../server/page-editor')
    const database = await db()

    const [project] = await database
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.slug, data.slug))

    if (!project) return null

    const { components } = await getPageComponents(project.id)
    return { name: project.name, components }
  })

export const Route = createFileRoute('/published/$slug')({
  loader: ({ params }) => getPublishedSite({ data: { slug: params.slug } }),
  component: PublishedSite,
})

function PublishedSite() {
  const data = Route.useLoaderData()

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400">Site not found</p>
      </div>
    )
  }

  if (data.components.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <h1 className="text-5xl font-bold text-gray-900">{data.name}</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {data.components.map((component: any, i: number) => renderComponent(component, i))}
    </div>
  )
}
