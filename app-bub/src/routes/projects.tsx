import { createFileRoute } from '@tanstack/react-router'
import { getProjects } from '../server/projects'
import { requireAuth } from '../lib/auth-guards'
import AuthContentLayout from '../components/AuthContentLayout'

export const Route = createFileRoute('/projects')({
  beforeLoad: requireAuth,
  loader: () => getProjects(),
  component: Projects,
})

function Projects() {
  const projects = Route.useLoaderData()

  return (
    <AuthContentLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Projects</h1>
        {projects.length === 0 ? (
          <p className="text-gray-400">No projects yet. Tell Bub to create one!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/project/${project.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <h2 className="font-semibold text-gray-900">{project.name}</h2>
                <p className="text-sm text-gray-400 mt-1">{project.status}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </AuthContentLayout>
  )
}
