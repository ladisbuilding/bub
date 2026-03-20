import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { requireAuth } from './auth-helpers'

const VALID_AI_PROVIDERS = ['', 'claude', 'openai', 'ollama-cloud']
const VALID_AI_MODELS: Record<string, string[]> = {
  'ollama-cloud': ['minimax-m2.7:cloud', 'deepseek-r1:70b', 'qwen3:32b', 'llama4-scout'],
}

export const getSettings = createServerFn({ method: 'GET' })
  .handler(async () => {
    const authedUser = await requireAuth()
    const database = await db()
    const [user] = await database
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        aiProvider: users.aiProvider,
        aiModel: users.aiModel,
        aiApiKey: users.aiApiKey,
      })
      .from(users)
      .where(eq(users.id, authedUser.id))
    return { ...user, hasApiKey: Boolean(user.aiApiKey), aiApiKey: undefined }
  })

export const updateSettings = createServerFn({ method: 'POST' })
  .inputValidator((data: { firstName: string; lastName: string; aiProvider: string; aiModel: string; aiApiKey: string }) => {
    if (!VALID_AI_PROVIDERS.includes(data.aiProvider)) {
      throw new Error('Invalid AI provider')
    }
    if (data.aiModel && VALID_AI_MODELS[data.aiProvider] && !VALID_AI_MODELS[data.aiProvider].includes(data.aiModel)) {
      throw new Error('Invalid AI model')
    }
    return data
  })
  .handler(async ({ data }) => {
    const authedUser = await requireAuth()
    const database = await db()
    await database
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        aiProvider: data.aiProvider,
        aiModel: data.aiModel || null,
        aiApiKey: data.aiApiKey || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authedUser.id))
    return { success: true }
  })
