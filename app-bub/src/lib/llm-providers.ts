interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callLLM(
  provider: string,
  apiKey: string,
  messages: Message[],
  systemPrompt: string,
  model?: string | null,
  maxTokens: number = 1024,
): Promise<string> {
  switch (provider) {
    case 'claude': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
        }),
      })
      if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
      const data = await res.json() as any
      return data.content[0].text
    }
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          max_tokens: maxTokens,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      })
      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
      const data = await res.json() as any
      return data.choices[0].message.content
    }
    case 'ollama-cloud': {
      const res = await fetch('https://api.ollama.com/api/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'minimax-m2.7:cloud',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: false,
        }),
      })
      if (!res.ok) throw new Error(`Ollama API error: ${res.status}`)
      const data = await res.json() as any
      return data.message.content
    }
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

export async function callBubLLM(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  maxTokens: number = 256,
): Promise<string> {
  const { env } = await import('cloudflare:workers')
  const apiKey = (env as any).ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
  const data = await res.json() as any
  return data.content[0].text
}
