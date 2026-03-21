import { useState, useEffect } from 'react'
import Chat from './Chat'
import Content from './Content'

interface AuthChatLayoutProps {
  hasProvider: boolean
}

export default function AuthChatLayout({ hasProvider: initialHasProvider }: AuthChatLayoutProps) {
  const [contentSrc, setContentSrc] = useState('/projects')
  const [mounted, setMounted] = useState(false)
  const [hasProvider, setHasProvider] = useState(initialHasProvider)
  const [chatStatus, setChatStatus] = useState<'ready' | 'saving' | 'failed'>('ready')
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) setContentSrc(hash)
    setMounted(true)

    function onHashChange() {
      const h = window.location.hash.slice(1)
      setContentSrc(h || '/projects')
    }

    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'bub:settings-saving') {
        setChatStatus('saving')
      } else if (e.data?.type === 'bub:settings-failed') {
        setChatStatus('failed')
      } else if (e.data?.type === 'bub:provider-configured') {
        setChatStatus('ready')
        setHasProvider(true)
        setWelcomeMessage('Welcome! My name is Bub and I am here to help you build digital tools.')
      }
    }

    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('message', onMessage)
    }
  }, [])

  function handleNavigate(path: string) {
    window.location.hash = path
    setContentSrc(path)
  }

  // Extract active project ID from content URL
  const projectIdMatch = contentSrc.match(/\/(project|site)\/([a-f0-9-]+)/)
  const activeProjectId = projectIdMatch ? projectIdMatch[2] : null

  return (
    <div className="flex h-screen">
      <Chat onNavigate={handleNavigate} hasProvider={hasProvider} chatStatus={chatStatus} welcomeMessage={welcomeMessage} activeProjectId={activeProjectId} />
      {mounted && <Content src={contentSrc} />}
    </div>
  )
}
