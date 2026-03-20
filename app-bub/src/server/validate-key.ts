import { createServerFn } from '@tanstack/react-start'

async function testClaudeKey(apiKey: string): Promise<boolean> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  })
  return res.ok
}

async function testOpenAIKey(apiKey: string): Promise<boolean> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return res.ok
}

async function testOllamaCloudKey(apiKey: string): Promise<boolean> {
  const res = await fetch('https://api.ollama.com/api/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimax-m2.7:cloud',
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
    }),
  })
  return res.ok
}

export const validateApiKey = createServerFn({ method: 'POST' })
  .inputValidator((data: { provider: string; apiKey: string }) => {
    if (!data.provider || !data.apiKey) throw new Error('Provider and API key are required')
    return data
  })
  .handler(async ({ data }) => {
    try {
      let valid = false
      switch (data.provider) {
        case 'claude':
          valid = await testClaudeKey(data.apiKey)
          break
        case 'openai':
          valid = await testOpenAIKey(data.apiKey)
          break
        case 'ollama-cloud':
          valid = await testOllamaCloudKey(data.apiKey)
          break
        default:
          return { valid: false }
      }
      return { valid }
    } catch {
      return { valid: false }
    }
  })
