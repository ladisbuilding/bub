import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq, and } from 'drizzle-orm'

const getProjectSite = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { db } = await import('../../db')
    const { projects, items, itemTypes } = await import('../../db/schema')
    const database = await db()

    const [project] = await database
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.id, data.id))

    if (!project) return null

    const [pageType] = await database
      .select({ id: itemTypes.id })
      .from(itemTypes)
      .where(and(eq(itemTypes.projectId, project.id), eq(itemTypes.slug, 'page')))

    if (!pageType) return { name: project.name, components: [] }

    const [homePage] = await database
      .select({ data: items.data })
      .from(items)
      .where(and(eq(items.projectId, project.id), eq(items.itemTypeId, pageType.id), eq(items.slug, 'home')))

    const components = (homePage?.data as any)?.components || []
    return { name: project.name, components }
  })

export const Route = createFileRoute('/site/$slug')({
  loader: ({ params }) => getProjectSite({ data: { id: params.slug } }),
  component: SitePreview,
})

// Component renderers
function HeroComponent({ props }: { props: any }) {
  const style = props.style || {}
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6"
      style={{
        backgroundColor: style.bgColor || '#f3f4f6',
        color: style.textColor || '#000000',
        minHeight: style.height || '33vh',
      }}
    >
      <h1 className="text-5xl font-bold">{props.title || ''}</h1>
      {props.subtitle && <p className="text-xl mt-4 opacity-70">{props.subtitle}</p>}
      {props.buttonText && (
        <a
          href={props.buttonUrl || '#'}
          className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
          style={props.buttonColor ? { backgroundColor: props.buttonColor } : undefined}
        >
          {props.buttonText}
        </a>
      )}
    </div>
  )
}

function TextBlockComponent({ props }: { props: any }) {
  const style = props.style || {}
  return (
    <div
      className="max-w-3xl mx-auto px-6 py-12"
      style={{ backgroundColor: style.bgColor || '#ffffff', color: style.textColor || '#000000' }}
    >
      {props.heading && <h2 className="text-3xl font-bold mb-4">{props.heading}</h2>}
      {props.body && <p className="text-lg leading-relaxed">{props.body}</p>}
    </div>
  )
}

function EmbedComponent({ props }: { props: any }) {
  const style = props.style || {}
  let embedUrl = props.url || ''

  // Convert Spotify URLs to embed format
  if (props.provider === 'spotify' && embedUrl) {
    if (!embedUrl.includes('/embed/')) {
      embedUrl = embedUrl.replace('open.spotify.com/', 'open.spotify.com/embed/')
    }
  }

  // Convert YouTube URLs to embed format
  if (props.provider === 'youtube' && embedUrl) {
    const match = embedUrl.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/)
    if (match) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}`
    }
  }

  return (
    <div
      className="mx-auto px-6 py-8 bg-white"
      style={{ maxWidth: style.maxWidth || '600px' }}
    >
      <iframe
        src={embedUrl}
        className="w-full rounded-lg"
        style={{ height: props.provider === 'spotify' ? '352px' : '315px' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        title={props.provider || 'embed'}
      />
    </div>
  )
}

function CtaComponent({ props }: { props: any }) {
  const style = props.style || {}
  return (
    <div
      className="text-center px-6 py-24"
      style={{ backgroundColor: style.bgColor || '#f3f4f6', color: style.textColor || '#000000' }}
    >
      <h2 className="text-3xl font-bold mb-2">{props.title || ''}</h2>
      {props.subtitle && <p className="text-lg mb-6 opacity-70">{props.subtitle}</p>}
      {props.buttonText && (
        <a
          href={props.buttonUrl || '#'}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500"
        >
          {props.buttonText}
        </a>
      )}
    </div>
  )
}

function FooterComponent({ props }: { props: any }) {
  const style = props.style || {}
  return (
    <footer
      className="text-center px-6 py-8 text-sm"
      style={{ backgroundColor: style.bgColor || '#1a1a1a', color: style.textColor || '#888888' }}
    >
      {props.text || ''}
    </footer>
  )
}

function renderComponent(component: any, index: number) {
  switch (component.type) {
    case 'hero':
      return <HeroComponent key={index} props={component.props || {}} />
    case 'text-block':
      return <TextBlockComponent key={index} props={component.props || {}} />
    case 'embed':
      return <EmbedComponent key={index} props={component.props || {}} />
    case 'cta':
      return <CtaComponent key={index} props={component.props || {}} />
    case 'footer':
      return <FooterComponent key={index} props={component.props || {}} />
    default:
      return null
  }
}

function SitePreview() {
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
