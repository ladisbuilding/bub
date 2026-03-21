import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getProject, publishProject } from '../../server/projects'
import { requireAuth } from '../../lib/auth-guards'
import { useTabs } from '../../hooks/useTabs'
import AuthContentLayout from '../../components/AuthContentLayout'

export const Route = createFileRoute('/project/$projectId')({
  beforeLoad: requireAuth,
  loader: ({ params }) => getProject({ data: { projectId: params.projectId } }),
  component: ProjectDetail,
})

type Tab = 'overview' | 'assets' | 'settings'

function ProjectDetail() {
  const project = Route.useLoaderData()
  const { activeTab, handleTabChange } = useTabs<Tab>('overview', `/project/${project.id}`, ['overview', 'assets', 'settings'])
  const [publishing, setPublishing] = useState(false)
  const isDev = typeof window !== 'undefined' && window.location.hostname.includes('app-dev')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(
    project.status === 'published'
      ? isDev ? `https://app-dev.bub.ai/published/${project.slug}` : `https://${project.slug}.bub.ai`
      : null
  )

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
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (window.parent !== window) {
                  window.parent.location.hash = `/site/${project.id}`
                } else {
                  window.location.href = `/site/${project.id}`
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              View Site
            </button>
            <button
              disabled={publishing}
              onClick={async () => {
                setPublishing(true)
                try {
                  const result = await publishProject({ data: { projectId: project.id } })
                  setPublishedUrl(result.url)
                } catch {}
                setPublishing(false)
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : publishedUrl ? 'Republish' : 'Publish Site'}
            </button>
          </div>
        </div>

        {publishedUrl && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-green-700">Live at <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">{publishedUrl}</a></span>
          </div>
        )}

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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
      {project.description && <p className="text-gray-600 mb-4">{project.description}</p>}
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
        <input type="text" defaultValue={project.name} disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea defaultValue={project.description || ''} disabled rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
        <input type="text" defaultValue={project.customDomain || ''} disabled placeholder="e.g. plantasia.com" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400" />
      </div>
      <p className="text-xs text-gray-400">To update these settings, ask Bub in the chat.</p>
    </div>
  )
}
