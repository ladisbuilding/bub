import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '../server/auth'
import AuthContentLayout from '../components/AuthContentLayout'

export const Route = createFileRoute('/projects')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/sign-in' })
    return { user }
  },
  component: Projects,
})

function Projects() {
  const { user } = Route.useRouteContext()
  return (
    <AuthContentLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="mt-2 text-gray-500">{user.email}</p>
      </div>
    </AuthContentLayout>
  )
}
