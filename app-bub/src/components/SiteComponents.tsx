import { transformEmbedUrl, getEmbedHeight } from '../lib/embed-utils'

export function HeroComponent({ props }: { props: any }) {
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

export function TextBlockComponent({ props }: { props: any }) {
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

export function EmbedComponent({ props }: { props: any }) {
  const style = props.style || {}
  const embedUrl = transformEmbedUrl(props.url || '', props.provider || '')

  return (
    <div className="mx-auto px-6 py-8 bg-white" style={{ maxWidth: style.maxWidth || '600px' }}>
      <iframe
        src={embedUrl}
        className="w-full rounded-lg"
        style={{ height: getEmbedHeight(props.provider || '') }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        title={props.provider || 'embed'}
      />
    </div>
  )
}

export function CtaComponent({ props }: { props: any }) {
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

export function FooterComponent({ props }: { props: any }) {
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

export function renderComponent(component: any, index: number) {
  switch (component.type) {
    case 'hero': return <HeroComponent key={index} props={component.props || {}} />
    case 'text-block': return <TextBlockComponent key={index} props={component.props || {}} />
    case 'embed': return <EmbedComponent key={index} props={component.props || {}} />
    case 'cta': return <CtaComponent key={index} props={component.props || {}} />
    case 'footer': return <FooterComponent key={index} props={component.props || {}} />
    default: return null
  }
}

// Preview variants (smaller) for admin
export function renderPreview(component: any, index: number) {
  const p = component.props || {}
  const s = p.style || {}

  switch (component.type) {
    case 'hero':
      return (
        <div key={index} className="flex flex-col items-center justify-center text-center px-6" style={{ backgroundColor: s.bgColor || '#f3f4f6', color: s.textColor || '#000', minHeight: s.height || '33vh' }}>
          <h1 className="text-3xl font-bold">{p.title}</h1>
          {p.subtitle && <p className="text-lg mt-2 opacity-70">{p.subtitle}</p>}
          {p.buttonText && <span className="inline-block mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium" style={p.buttonColor ? { backgroundColor: p.buttonColor } : undefined}>{p.buttonText}</span>}
        </div>
      )
    case 'text-block':
      return (
        <div key={index} className="max-w-2xl mx-auto px-6 py-8" style={{ backgroundColor: s.bgColor || '#fff', color: s.textColor || '#000' }}>
          {p.heading && <h2 className="text-2xl font-bold mb-3">{p.heading}</h2>}
          {p.body && <p className="leading-relaxed text-gray-600">{p.body}</p>}
        </div>
      )
    case 'embed':
      return (
        <div key={index} className="mx-auto px-6 py-6" style={{ maxWidth: '500px' }}>
          <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: '152px' }}>
            <p className="text-sm text-gray-400">Spotify / YouTube embed</p>
          </div>
        </div>
      )
    case 'cta':
      return (
        <div key={index} className="text-center px-6 py-16" style={{ backgroundColor: s.bgColor || '#f3f4f6', color: s.textColor || '#000' }}>
          <h2 className="text-2xl font-bold mb-1">{p.title}</h2>
          {p.subtitle && <p className="mb-4 opacity-70">{p.subtitle}</p>}
          {p.buttonText && <span className="inline-block px-5 py-2 bg-white/20 border border-current rounded-lg text-sm font-medium">{p.buttonText}</span>}
        </div>
      )
    case 'footer':
      return (
        <footer key={index} className="text-center px-6 py-6 text-sm" style={{ backgroundColor: s.bgColor || '#1a1a1a', color: s.textColor || '#888' }}>{p.text}</footer>
      )
    default:
      return <div key={index} className="p-4 text-gray-400 text-sm">Unknown component: {component.type}</div>
  }
}
