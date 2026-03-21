import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSettings, updateSettings } from '../server/settings'
import { validateApiKey } from '../server/validate-key'
import { requireAuth } from '../lib/auth-guards'
import AuthContentLayout from '../components/AuthContentLayout'
import Input from '../components/Input'
import Select from '../components/Select'
import Button from '../components/Button'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuth,
  loader: () => getSettings(),
  component: Settings,
})

const aiProviders = [
  { value: '', label: 'Select a provider' },
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'ollama-cloud', label: 'Ollama Cloud' },
]

const ollamaModels = [
  { value: '', label: 'Select a model' },
  { value: 'minimax-m2.7:cloud', label: 'Minimax 2.7' },
  { value: 'deepseek-r1:70b', label: 'DeepSeek R1 70B' },
  { value: 'qwen3:32b', label: 'Qwen3 32B' },
  { value: 'llama4-scout', label: 'Llama 4 Scout' },
]

const apiKeyConfig: Record<string, { label: string; placeholder: string; url: string }> = {
  claude: {
    label: 'Anthropic API Key',
    placeholder: 'sk-ant-...',
    url: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    url: 'https://platform.openai.com/api-keys',
  },
  'ollama-cloud': {
    label: 'Ollama API Key',
    placeholder: 'Your Ollama API key',
    url: 'https://ollama.com/settings/keys',
  },
}

function Settings() {
  const data = Route.useLoaderData()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiProvider, setAiProvider] = useState(data.aiProvider ?? '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const provider = form.get('aiProvider') as string
    const apiKey = form.get('aiApiKey') as string || ''
    const model = form.get('aiModel') as string || ''

    try {
      if (apiKey && provider && window.parent !== window) {
        window.parent.postMessage({ type: 'bub:settings-saving' }, '*')
      }

      if (apiKey && provider) {
        const result = await validateApiKey({ data: { provider, apiKey } })
        if (!result.valid) {
          setError('Invalid API key. Please check and try again.')
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'bub:settings-failed' }, '*')
          }
          setLoading(false)
          return
        }
      }

      await updateSettings({
        data: {
          firstName: form.get('firstName') as string,
          lastName: form.get('lastName') as string,
          aiProvider: provider,
          aiModel: model,
          aiApiKey: apiKey,
        },
      })
      setSuccess(true)

      if (apiKey && provider && window.parent !== window) {
        const providerLabel = aiProviders.find((p) => p.value === provider)?.label ?? provider
        const modelLabel = model
          ? ollamaModels.find((m) => m.value === model)?.label ?? model
          : providerLabel
        window.parent.postMessage(
          { type: 'bub:provider-configured', provider: providerLabel, model: modelLabel },
          '*',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContentLayout>
      <div className="flex justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              Settings saved
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="Email" id="email" type="email" value={data.email} disabled theme="light" />
            <Input label="First name" id="firstName" name="firstName" defaultValue={data.firstName ?? ''} theme="light" />
            <Input label="Last name" id="lastName" name="lastName" defaultValue={data.lastName ?? ''} theme="light" />
            <Select
              label="AI Provider"
              id="aiProvider"
              name="aiProvider"
              options={aiProviders}
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              theme="light"
            />
            {aiProvider === 'ollama-cloud' && (
              <Select
                label="Model"
                id="aiModel"
                name="aiModel"
                options={ollamaModels}
                defaultValue={data.aiModel ?? ''}
                theme="light"
              />
            )}
            {aiProvider && apiKeyConfig[aiProvider] && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="aiApiKey" className="text-sm font-medium text-gray-700">
                    {apiKeyConfig[aiProvider].label}
                  </label>
                  <a
                    href={apiKeyConfig[aiProvider].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    Get API key
                  </a>
                </div>
                <input
                  id="aiApiKey"
                  name="aiApiKey"
                  type="password"
                  placeholder={data.hasApiKey ? '••••••••••••••••' : apiKeyConfig[aiProvider].placeholder}
                  className="w-full px-3 py-2 border rounded-lg bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </div>
      </div>
    </AuthContentLayout>
  )
}
