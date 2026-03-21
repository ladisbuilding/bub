import { createFileRoute } from '@tanstack/react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AuthChatLayout from '../components/AuthChatLayout'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { user } = Route.useRouteContext()

  if (user) {
    const hasProvider = Boolean(user.aiProvider && user.hasApiKey)
    return <AuthChatLayout hasProvider={hasProvider} isAdmin={user.role === 'admin'} />
  }

  return (
    <>
      <Header user={null} />
      <main className="flex-1 flex items-center pt-16">
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-5xl font-bold text-white">Bub.ai</h1>
        </div>
      </main>
      <Footer />
    </>
  )
}
