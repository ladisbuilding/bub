import { eq, and } from 'drizzle-orm'
import { transformEmbedUrl, getEmbedHeight } from '../lib/embed-utils'

async function getProjectAndComponents(finder: () => Promise<any>): Promise<Response> {
  const { getPageComponents } = await import('./page-editor')

  const project = await finder()

  if (!project || project.status !== 'published') {
    return new Response('Site not found', { status: 404 })
  }

  const { components } = await getPageComponents(project.id)
  const html = renderComponentsToHtml(project.name, components)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/** Renders a published site by project slug (for {slug}.bub.ai) */
export async function renderPublishedSite(slug: string): Promise<Response> {
  const { db } = await import('../db')
  const { projects } = await import('../db/schema')

  return getProjectAndComponents(async () => {
    const database = await db()
    const [project] = await database
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(eq(projects.slug, slug))
    return project
  })
}

/** Renders a published site by custom domain (for user's own domain) */
export async function renderCustomDomainSite(hostname: string): Promise<Response> {
  const { db } = await import('../db')
  const { projects } = await import('../db/schema')

  return getProjectAndComponents(async () => {
    const database = await db()
    const [project] = await database
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(eq(projects.customDomain, hostname))
    return project
  })
}

function renderComponentsToHtml(projectName: string, components: any[]): string {
  const body = components.length > 0
    ? components.map(renderComponent).join('\n')
    : `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff"><h1 style="font-size:3rem;font-weight:bold">${esc(projectName)}</h1></div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(projectName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    a { text-decoration: none; }
  </style>
</head>
<body>
${body}
</body>
</html>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderComponent(c: any): string {
  const p = c.props || {}
  const s = p.style || {}

  switch (c.type) {
    case 'hero':
      return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5rem;min-height:${s.height || '33vh'};background:${s.bgColor || '#f3f4f6'};color:${s.textColor || '#000'}">
  <h1 style="font-size:3rem;font-weight:bold">${esc(p.title || '')}</h1>
  ${p.subtitle ? `<p style="font-size:1.25rem;margin-top:1rem;opacity:0.7">${esc(p.subtitle)}</p>` : ''}
  ${p.buttonText ? `<a href="${esc(p.buttonUrl || '#')}" style="display:inline-block;margin-top:1.5rem;padding:0.75rem 1.5rem;background:${p.buttonColor || '#2563eb'};color:#fff;border-radius:0.5rem;font-weight:500">${esc(p.buttonText)}</a>` : ''}
</div>`

    case 'text-block':
      return `<div style="max-width:48rem;margin:0 auto;padding:3rem 1.5rem;background:${s.bgColor || '#fff'};color:${s.textColor || '#000'}">
  ${p.heading ? `<h2 style="font-size:1.875rem;font-weight:bold;margin-bottom:1rem">${esc(p.heading)}</h2>` : ''}
  ${p.body ? `<p style="font-size:1.125rem;line-height:1.75">${esc(p.body)}</p>` : ''}
</div>`

    case 'embed': {
      const url = transformEmbedUrl(p.url || '', p.provider || '')
      const height = getEmbedHeight(p.provider || '')
      return `<div style="max-width:${s.maxWidth || '600px'};margin:0 auto;padding:2rem 1.5rem">
  <iframe src="${esc(url)}" style="width:100%;height:${height};border:none;border-radius:0.75rem" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe>
</div>`
    }

    case 'cta':
      return `<div style="text-align:center;padding:6rem 1.5rem;background:${s.bgColor || '#f3f4f6'};color:${s.textColor || '#000'}">
  <h2 style="font-size:1.875rem;font-weight:bold;margin-bottom:0.5rem">${esc(p.title || '')}</h2>
  ${p.subtitle ? `<p style="font-size:1.125rem;margin-bottom:1.5rem;opacity:0.7">${esc(p.subtitle)}</p>` : ''}
  ${p.buttonText ? `<a href="${esc(p.buttonUrl || '#')}" style="display:inline-block;padding:0.75rem 1.5rem;background:#2563eb;color:#fff;border-radius:0.5rem;font-weight:500">${esc(p.buttonText)}</a>` : ''}
</div>`

    case 'footer':
      return `<footer style="text-align:center;padding:2rem 1.5rem;font-size:0.875rem;background:${s.bgColor || '#1a1a1a'};color:${s.textColor || '#888'}">
  ${esc(p.text || '')}
</footer>`

    default:
      return ''
  }
}
