import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { getCurrentUser } from '../../server/auth'
import { getProject } from '../../server/projects'
import AuthContentLayout from '../../components/AuthContentLayout'

export const Route = createFileRoute('/project/$projectId')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/sign-in' })
  },
  loader: ({ params }) => getProject({ data: { projectId: params.projectId } }),
  component: ProjectDetail,
})

type Tab = 'overview' | 'assets' | 'settings'

function ProjectDetail() {
  const project = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'assets', label: 'Assets' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <AuthContentLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <button
            onClick={() => {
              if (window.parent !== window) {
                window.parent.location.hash = `/site/${project.id}`
              } else {
                window.location.href = `/site/${project.id}`
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer"
          >
            View Site
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab project={project} />}
        {activeTab === 'assets' && <AssetsTab />}
        {activeTab === 'settings' && <SettingsTab project={project} />}
      </div>
    </AuthContentLayout>
  )
}

function OverviewTab({ project }: { project: any }) {
  return (
    <div>
      {project.description && (
        <p className="text-gray-600 mb-4">{project.description}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-medium text-gray-900 capitalize">{project.status}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Slug</p>
          <p className="font-medium text-gray-900">{project.slug}</p>
        </div>
      </div>
    </div>
  )
}

function AssetsTab() {
  return (
    <div>
      <p className="text-gray-400 text-sm">No assets yet. Ask Bub to create images, PDFs, or other files for this project.</p>
    </div>
  )
}

function SettingsTab({ project }: { project: any }) {
  return (
    <div className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
        <input
          type="text"
          defaultValue={project.name}
          disabled
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          defaultValue={project.description || ''}
          disabled
          rows={3}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
        <input
          type="text"
          defaultValue={project.customDomain || ''}
          disabled
          placeholder="e.g. plantasia.com"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400"
        />
      </div>
      <p className="text-xs text-gray-400">To update these settings, ask Bub in the chat.</p>
    </div>
  )
}
