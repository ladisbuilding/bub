import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const tanstackHandler = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url)
    const hostname = url.hostname

    // Published site subdomain: {slug}.bub.ai (not app/www/domain)
    if (hostname.endsWith('.bub.ai') && !hostname.startsWith('app') && !hostname.startsWith('www') && !hostname.startsWith('domain')) {
      const slug = hostname.replace('.bub.ai', '')
      const { renderPublishedSite } = await import('./server/site-renderer')
      return renderPublishedSite(slug)
    }

    // Custom domain: any hostname that's not *.bub.ai
    if (!hostname.endsWith('.bub.ai') && !hostname.endsWith('.workers.dev') && hostname !== 'localhost') {
      const { renderCustomDomainSite } = await import('./server/site-renderer')
      return renderCustomDomainSite(hostname)
    }

    // Dashboard: app.bub.ai, app-dev.bub.ai, localhost
    return tanstackHandler(request, env, ctx)
  },
}
