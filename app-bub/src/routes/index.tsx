import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <h1 className="text-5xl font-bold text-white">Bub.ai</h1>
    </div>
  )
}
