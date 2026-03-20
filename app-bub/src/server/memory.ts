import { createServerFn } from '@tanstack/react-start'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db'
import { users, chats, messages as messagesTable, chatSummaries } from '../db/schema'
import { requireAuth } from './auth-helpers'

const SUMMARY_PROMPT = `Summarize this conversation. Include:
- What the user was trying to build or accomplish
- Key decisions made
- Any research done and findings
- Technical details discussed
- Unresolved questions or next steps

Keep it concise but specific enough to be useful for future reference. Write in second person ("You were building...").`

const PAST_CONTEXT_KEYWORDS = [
  'remember', 'last time', 'before', 'earlier', 'we discussed',
  'we talked about', 'that thing', 'go back to', 'previous',
  'ago', 'we were', 'you mentioned', 'we did', 'we built',
  'we decided', 'we researched', 'we found',
]

async function callProviderForSummary(
  provider: string,
  apiKey: string,
  model: string | null,
  conversationText: string,
): Promise<string> {
  const messages = [
    { role: 'system', content: SUMMARY_PROMPT },
    { role: 'user', content: conversationText },
  ]

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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: SUMMARY_PROMPT,
          messages: [{ role: 'user', content: conversationText }],
        }),
      })
      const data = await res.json() as any
      return data.content[0].text
    }
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 512, messages }),
      })
      const data = await res.json() as any
      return data.choices[0].message.content
    }
    case 'ollama-cloud': {
      const res = await fetch('https://api.ollama.com/api/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'minimax-m2.7:cloud', messages, stream: false }),
      })
      const data = await res.json() as any
      return data.message.content
    }
    default:
      throw new Error('Unknown provider')
  }
}

export function shouldRetrieveContext(message: string): boolean {
  const lower = message.toLowerCase()
  return PAST_CONTEXT_KEYWORDS.some((kw) => lower.includes(kw))
}

export const generateSummary = createServerFn({ method: 'POST' })
  .inputValidator((data: { chatId: string }) => {
    if (!data.chatId) throw new Error('Chat ID required')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    const database = await db()

    // Get user's AI provider
    const [user] = await database
      .select({ aiProvider: users.aiProvider, aiModel: users.aiModel, aiApiKey: users.aiApiKey })
      .from(users)
      .where(eq(users.id, authedUser.id))

    if (!user.aiProvider || !user.aiApiKey) return null

    // Get messages for this chat
    const chatMessages = await database
      .select({ role: messagesTable.role, content: messagesTable.content })
      .from(messagesTable)
      .where(eq(messagesTable.chatId, data.chatId))
      .orderBy(asc(messagesTable.createdAt))

    if (chatMessages.length < 2) return null

    // Check if we already have a summary for this chat
    const [existing] = await database
      .select({ id: chatSummaries.id })
      .from(chatSummaries)
      .where(eq(chatSummaries.chatId, data.chatId))

    if (existing) return null

    // Format conversation for summary
    const conversationText = chatMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    // Generate summary
    const summary = await callProviderForSummary(
      user.aiProvider, user.aiApiKey, user.aiModel, conversationText,
    )

    // Embed summary via Workers AI
    const { env } = await import('cloudflare:workers')
    const embeddingResult = await (env as any).AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [summary],
    })
    const embedding = embeddingResult.data[0]

    // Store in Vectorize
    const vectorId = crypto.randomUUID()
    await (env as any).VECTORIZE.upsert([{
      id: vectorId,
      values: embedding,
      metadata: {
        user_id: authedUser.id,
        chat_id: data.chatId,
      },
    }])

    // Store summary in DB
    await database.insert(chatSummaries).values({
      chatId: data.chatId,
      userId: authedUser.id,
      summary,
      vectorizeId: vectorId,
    })

    return { summary }
  })

export const retrieveContext = createServerFn({ method: 'POST' })
  .inputValidator((data: { message: string }) => {
    if (!data.message) throw new Error('Message required')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()

    // Embed the query
    const { env } = await import('cloudflare:workers')
    const embeddingResult = await (env as any).AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [data.message],
    })
    const queryEmbedding = embeddingResult.data[0]

    // Search Vectorize
    const results = await (env as any).VECTORIZE.query(queryEmbedding, {
      topK: 3,
      filter: { user_id: authedUser.id },
      returnMetadata: true,
    })

    if (!results.matches || results.matches.length === 0) return null

    // Load summaries from DB for top matches
    const database = await db()
    const summaries: string[] = []

    for (const match of results.matches) {
      if (match.score < 0.7) continue
      const [row] = await database
        .select({ summary: chatSummaries.summary, createdAt: chatSummaries.createdAt })
        .from(chatSummaries)
        .where(eq(chatSummaries.vectorizeId, match.id))

      if (row) {
        const date = row.createdAt.toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })
        summaries.push(`[${date}] ${row.summary}`)
      }
    }

    if (summaries.length === 0) return null

    return summaries.join('\n\n')
  })
