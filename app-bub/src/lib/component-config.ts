export interface ComponentConfig {
  type: string
  name: string
  description: string
  props: string[]
  style: string[]
  defaults: Record<string, any>
  sample: Record<string, any>
}

export const COMPONENT_REGISTRY: ComponentConfig[] = [
  {
    type: 'hero',
    name: 'Hero',
    description: 'Full-height banner with title, subtitle, button, and background',
    props: ['title', 'subtitle', 'buttonText', 'buttonUrl', 'buttonColor'],
    style: ['bgColor', 'textColor', 'height'],
    defaults: { title: '', subtitle: '', buttonText: '', buttonUrl: '', buttonColor: '', style: {} },
    sample: { title: 'Welcome to My Site', subtitle: 'A beautiful place on the web', buttonText: 'Get Started', buttonUrl: '#' },
  },
  {
    type: 'text-block',
    name: 'Text Block',
    description: 'Heading and body text section',
    props: ['heading', 'body'],
    style: ['bgColor', 'textColor'],
    defaults: { heading: '', body: '', style: {} },
    sample: { heading: 'About Us', body: 'We are a team of passionate builders creating tools for the modern web. Our mission is to make digital creation accessible to everyone.' },
  },
  {
    type: 'embed',
    name: 'Embed',
    description: 'Spotify, YouTube, or any iframe embed',
    props: ['provider', 'url'],
    style: ['maxWidth'],
    defaults: { provider: '', url: '', style: {} },
    sample: { provider: 'spotify', url: 'https://open.spotify.com/embed/album/0rJhsNH02D3eo1ySHhAbKy' },
  },
  {
    type: 'cta',
    name: 'Call to Action',
    description: 'Banner with title, subtitle, and action button',
    props: ['title', 'subtitle', 'buttonText', 'buttonUrl'],
    style: ['bgColor', 'textColor'],
    defaults: { title: '', subtitle: '', buttonText: '', buttonUrl: '', style: {} },
    sample: { title: 'Ready to get started?', subtitle: 'Join thousands of happy users today.', buttonText: 'Sign Up Free', buttonUrl: '#', style: { bgColor: '#3b82f6', textColor: '#ffffff' } },
  },
  {
    type: 'footer',
    name: 'Footer',
    description: 'Site footer with text and links',
    props: ['text'],
    style: ['bgColor', 'textColor'],
    defaults: { text: '', style: {} },
    sample: { text: '© 2026 My Site. All rights reserved.', style: { bgColor: '#111827', textColor: '#9ca3af' } },
  },
]

export const COMPONENT_DEFAULTS = Object.fromEntries(
  COMPONENT_REGISTRY.map((c) => [c.type, c.defaults]),
)
