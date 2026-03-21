export function transformEmbedUrl(url: string, provider: string): string {
  if (provider === 'spotify' && url && !url.includes('/embed/')) {
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
  }
  if (provider === 'youtube' && url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  return url
}

export function getEmbedHeight(provider: string): string {
  return provider === 'spotify' ? '352px' : '315px'
}
