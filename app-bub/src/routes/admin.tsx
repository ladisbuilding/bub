import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import AuthContentLayout from '../components/AuthContentLayout'
import { renderPreview } from '../components/SiteComponents'
import { COMPONENT_REGISTRY } from '../lib/component-config'
import { requireAdmin } from '../lib/auth-guards'
import { useTabs } from '../hooks/useTabs'

const getAdminStats = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { db } = await import('../db')
    const { users, projects, chats, messages, items } = await import('../db/schema')
    const database = await db()

    const [userCount] = await database.select({ count: users.id }).from(users)
    const [projectCount] = await database.select({ count: projects.id }).from(projects)
    const [chatCount] = await database.select({ count: chats.id }).from(chats)
    const [messageCount] = await database.select({ count: messages.id }).from(messages)
    const [itemCount] = await database.select({ count: items.id }).from(items)

    const recentUsers = await database
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.createdAt)
      .limit(20)

    return {
      counts: {
        users: userCount?.count ? 1 : 0,
        projects: projectCount?.count ? 1 : 0,
        chats: chatCount?.count ? 1 : 0,
        messages: messageCount?.count ? 1 : 0,
        items: itemCount?.count ? 1 : 0,
      },
      recentUsers,
    }
  })

export const Route = createFileRoute('/admin')({
  beforeLoad: requireAdmin,
  loader: () => getAdminStats(),
  component: Admin,
})

type Tab = 'overview' | 'users' | 'components'

function Admin() {
  const { counts, recentUsers } = Route.useLoaderData()
  const { activeTab, handleTabChange } = useTabs<Tab>('overview', '/admin', ['overview', 'users', 'components'])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'components', label: 'Components' },
  ]

  return (
    <AuthContentLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin</h1>

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

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 capitalize">{key}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-8">
            {COMPONENT_REGISTRY.map((comp) => (
              <div key={comp.type} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{comp.description}</p>
                    </div>
                    <span className="text-xs font-mono bg-gray-200 text-gray-600 px-2 py-1 rounded">{comp.type}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Props: {comp.props.join(', ')}</span>
                    <span>Style: {comp.style.join(', ')}</span>
                  </div>
                </div>
                <div className="bg-white">
                  {renderPreview({ type: comp.type, props: comp.sample }, 0)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Role</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u: any) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-900">{u.email}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthContentLayout>
  )
}
