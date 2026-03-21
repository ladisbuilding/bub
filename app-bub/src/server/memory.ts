import { createServerFn } from '@tanstack/react-start'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db'
import { chatSummaries, messages as messagesTable } from '../db/schema'
import { requireAuth } from './auth-helpers'
import { callBubLLM } from '../lib/llm-providers'

const SUMMARY_PROMPT = `Summarize this conversation in 2-4 sentences. Include:
- What the user was trying to build or accomplish
- Key decisions made
- Current status or next steps

Rules:
- Write in second person ("You were building...")
- Do NOT include any code, code blocks, or technical implementation details
- Do NOT include markdown formatting
- Keep it plain text, concise, and specific
- Focus on WHAT was discussed, not HOW it was implemented`

const PAST_CONTEXT_KEYWORDS = [
  'remember', 'last time', 'before', 'earlier', 'we discussed',
  'we talked about', 'that thing', 'go back to', 'previous',
  'ago', 'we were', 'you mentioned', 'we did', 'we built',
  'we decided', 'we researched', 'we found',
]

export function shouldRetrieveContext(message: string): boolean {
  const lower = message.toLowerCase()
  return PAST_CONTEXT_KEYWORDS.some((kw) => lower.includes(kw))
}

// Internal function — called directly from sendMessage
export async function generateSummaryInternal(chatId: string, userId: string): Promise<{ summary: string } | null> {
  const database = await db()

  const chatMessages = await database
    .select({ role: messagesTable.role, content: messagesTable.content })
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId))
    .orderBy(asc(messagesTable.createdAt))

  if (chatMessages.length < 2) return null

  const [existing] = await database
    .select({ id: chatSummaries.id })
    .from(chatSummaries)
    .where(eq(chatSummaries.chatId, chatId))

  if (existing) return null

  const conversationText = chatMessages
    .map((m) => {
      const cleaned = m.content.replace(/```[\s\S]*?```/g, '[code block]').substring(0, 300)
      return `${m.role}: ${cleaned}`
    })
    .join('\n')

  let summary = await callBubLLM([{ role: 'user', content: conversationText }], SUMMARY_PROMPT)

  // Post-process: strip any code blocks the LLM snuck in
  summary = summary.replace(/```[\s\S]*?```/g, '').replace(/^#+\s.*$/gm, '').replace(/\n{3,}/g, '\n\n').trim()

  // If stripping removed everything, use a fallback summary
  if (!summary || summary.length < 20) {
    const lastUserMsg = chatMessages.filter((m) => m.role === 'user').pop()
    summary = `You were discussing: ${lastUserMsg?.content.substring(0, 200) || 'various topics'}`
  }

  // Save summary to DB
  await database.insert(chatSummaries).values({
    chatId,
    userId,
    summary,
    vectorizeId: null,
  })

  // Try to embed and store in Vectorize (best effort)
  try {
    const { env } = await import('cloudflare:workers')
    const embeddingResult = await (env as any).AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [summary],
    })
    const embedding = embeddingResult.data[0]
    const vectorId = crypto.randomUUID()
    await (env as any).VECTORIZE.upsert([{
      id: vectorId,
      values: embedding,
      metadata: { user_id: userId, chat_id: chatId },
    }])
    await database.update(chatSummaries)
      .set({ vectorizeId: vectorId })
      .where(eq(chatSummaries.chatId, chatId))
  } catch {
    // Vectorize not available in dev — summary still saved
  }

  return { summary }
}

// Internal function — called directly from sendMessage
export async function retrieveContextInternal(message: string, userId: string): Promise<string | null> {
  const { env } = await import('cloudflare:workers')
  const embeddingResult = await (env as any).AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [message],
  })
  const queryEmbedding = embeddingResult.data[0]

  const results = await (env as any).VECTORIZE.query(queryEmbedding, {
    topK: 3,
    filter: { user_id: userId },
    returnMetadata: true,
  })

  if (!results.matches || results.matches.length === 0) return null

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
}

// Server function wrappers (for calling from routes if needed)
export const generateSummary = createServerFn({ method: 'POST' })
  .inputValidator((data: { chatId: string }) => {
    if (!data.chatId) throw new Error('Chat ID required')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    return generateSummaryInternal(data.chatId, authedUser.id)
  })

export const retrieveContext = createServerFn({ method: 'POST' })
  .inputValidator((data: { message: string }) => {
    if (!data.message) throw new Error('Message required')
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    return retrieveContextInternal(data.message, authedUser.id)
  })
