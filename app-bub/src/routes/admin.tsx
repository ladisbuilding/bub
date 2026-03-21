import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import AuthContentLayout from '../components/AuthContentLayout'
import { getCurrentUser } from '../server/auth'

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
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') throw redirect({ to: '/' })
  },
  loader: () => getAdminStats(),
  component: Admin,
})

function ComponentPreview({ type, props }: { type: string; props: any }) {
  const style = props.style || {}

  switch (type) {
    case 'hero':
      return (
        <div className="flex flex-col items-center justify-center text-center px-6" style={{ backgroundColor: style.bgColor || '#f3f4f6', color: style.textColor || '#000', minHeight: style.height || '33vh' }}>
          <h1 className="text-3xl font-bold">{props.title}</h1>
          {props.subtitle && <p className="text-lg mt-2 opacity-70">{props.subtitle}</p>}
          {props.buttonText && (
            <span className="inline-block mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium" style={props.buttonColor ? { backgroundColor: props.buttonColor } : undefined}>
              {props.buttonText}
            </span>
          )}
        </div>
      )
    case 'text-block':
      return (
        <div className="max-w-2xl mx-auto px-6 py-8" style={{ backgroundColor: style.bgColor, color: style.textColor }}>
          {props.heading && <h2 className="text-2xl font-bold mb-3">{props.heading}</h2>}
          {props.body && <p className="leading-relaxed text-gray-600">{props.body}</p>}
        </div>
      )
    case 'embed':
      return (
        <div className="mx-auto px-6 py-6" style={{ maxWidth: '500px' }}>
          <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: '152px' }}>
            <p className="text-sm text-gray-400">Spotify / YouTube embed</p>
          </div>
        </div>
      )
    case 'cta':
      return (
        <div className="text-center px-6 py-16" style={{ backgroundColor: style.bgColor || '#f3f4f6', color: style.textColor || '#000' }}>
          <h2 className="text-2xl font-bold mb-1">{props.title}</h2>
          {props.subtitle && <p className="mb-4 opacity-70">{props.subtitle}</p>}
          {props.buttonText && <span className="inline-block px-5 py-2 bg-white/20 border border-current rounded-lg text-sm font-medium">{props.buttonText}</span>}
        </div>
      )
    case 'footer':
      return (
        <footer className="text-center px-6 py-6 text-sm" style={{ backgroundColor: style.bgColor || '#1a1a1a', color: style.textColor || '#888' }}>
          {props.text}
        </footer>
      )
    default:
      return <div className="p-4 text-gray-400 text-sm">Unknown component: {type}</div>
  }
}

type Tab = 'overview' | 'users' | 'components'

const COMPONENT_REGISTRY = [
  {
    type: 'hero',
    name: 'Hero',
    description: 'Full-height banner with title, subtitle, button, and background',
    props: ['title', 'subtitle', 'buttonText', 'buttonUrl', 'buttonColor'],
    style: ['bgColor', 'textColor', 'height'],
    sample: { title: 'Welcome to My Site', subtitle: 'A beautiful place on the web', buttonText: 'Get Started', buttonUrl: '#' },
  },
  {
    type: 'text-block',
    name: 'Text Block',
    description: 'Heading and body text section',
    props: ['heading', 'body'],
    style: ['bgColor', 'textColor'],
    sample: { heading: 'About Us', body: 'We are a team of passionate builders creating tools for the modern web. Our mission is to make digital creation accessible to everyone.' },
  },
  {
    type: 'embed',
    name: 'Embed',
    description: 'Spotify, YouTube, or any iframe embed',
    props: ['provider', 'url'],
    style: ['maxWidth'],
    sample: { provider: 'spotify', url: 'https://open.spotify.com/embed/album/0rJhsNH02D3eo1ySHhAbKy' },
  },
  {
    type: 'cta',
    name: 'Call to Action',
    description: 'Banner with title, subtitle, and action button',
    props: ['title', 'subtitle', 'buttonText', 'buttonUrl'],
    style: ['bgColor', 'textColor'],
    sample: { title: 'Ready to get started?', subtitle: 'Join thousands of happy users today.', buttonText: 'Sign Up Free', buttonUrl: '#', style: { bgColor: '#3b82f6', textColor: '#ffffff' } },
  },
  {
    type: 'footer',
    name: 'Footer',
    description: 'Site footer with text and links',
    props: ['text'],
    style: ['bgColor', 'textColor'],
    sample: { text: '© 2026 My Site. All rights reserved.', style: { bgColor: '#111827', textColor: '#9ca3af' } },
  },
]

function getTabFromHash(): Tab {
  if (typeof window === 'undefined') return 'overview'
  const parentHash = window.parent !== window ? window.parent.location.hash : window.location.hash
  const match = parentHash.match(/\/admin\/(\w+)/)
  if (match && ['overview', 'users', 'components'].includes(match[1])) return match[1] as Tab
  return 'overview'
}

function Admin() {
  const { counts, recentUsers } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash)

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    const path = tab === 'overview' ? '/admin' : `/admin/${tab}`
    if (window.parent !== window) {
      window.parent.location.hash = path
    }
  }

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
                  <ComponentPreview type={comp.type} props={comp.sample} />
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
