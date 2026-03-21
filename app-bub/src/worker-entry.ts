import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const tanstackHandler = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url)
    const hostname = url.hostname

    // Check if this is a published site subdomain (not app.bub.ai or app-dev.bub.ai)
    if (hostname.endsWith('.bub.ai') && !hostname.startsWith('app') && !hostname.startsWith('www')) {
      const slug = hostname.replace('.bub.ai', '')
      const { renderPublishedSite } = await import('./server/site-renderer')
      return renderPublishedSite(slug)
    }

    // Otherwise, pass to TanStack Start
    return tanstackHandler(request, env, ctx)
  },
}
