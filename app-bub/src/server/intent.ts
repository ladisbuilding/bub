import { callBubLLM } from '../lib/llm-providers'

export interface IntentResult {
  action: 'none' | 'create_project' | 'navigate_site' | 'navigate_project' | 'rename_project' | 'add_component' | 'edit_component' | 'remove_component' | 'reset_component'
  projectName?: string
  projectDescription?: string
  newName?: string
  componentType?: string
  componentProps?: Record<string, any>
  targetComponent?: string
  changes?: Record<string, any>
}

const INTENT_PROMPT = `You are an intent classifier. Given a user message, determine the intent. Respond with ONLY a JSON object, nothing else.

Possible intents:
- {"action":"create_project","projectName":"...","projectDescription":"..."} — user wants to create/build/make a new website, app, or project
- {"action":"navigate_site"} — user wants to see/view/open/show/preview the live site
- {"action":"navigate_project"} — user wants to see the project dashboard/settings
- {"action":"rename_project","newName":"..."} — user wants to rename the project
- {"action":"add_component","componentType":"...","componentProps":{...}} — user wants to add something to the site (embed, section, text, etc.)
- {"action":"edit_component","targetComponent":"...","changes":{...}} — user wants to change an existing component (color, text, style)
- {"action":"remove_component","targetComponent":"..."} — user wants to remove a component
- {"action":"reset_component","targetComponent":"..."} — user wants to reset a component to its defaults
- {"action":"none"} — anything else (questions, general chat)

Available component types for add_component:
- hero: title, subtitle, buttonText, buttonUrl, buttonColor, style (bgColor, textColor, height)
- text-block: heading, body, style
- embed: provider (spotify, youtube), url, style
- cta: title, subtitle, buttonText, buttonUrl, style
- footer: text, style

Rules:
- Only return create_project if user is clearly asking to CREATE something new
- "show me the site", "let me see it", "open it", "preview" → navigate_site
- "rename it to X", "call it X instead" → rename_project
- "add a spotify player", "put a music player on the site" → add_component with type embed
- "make the footer blue", "change the background" → edit_component
- "add a button to the hero" → edit_component with targetComponent "hero" and changes {buttonText, buttonUrl}
- "remove the hero", "delete the footer" → remove_component
- "reset the hero", "reset hero to defaults" → reset_component
- For add_component, infer componentType and reasonable default props
- For edit_component, identify which component and what changes
- If unsure, return {"action":"none"}`

export async function detectIntent(
  message: string,
  projectNames: string[],
  currentComponents?: string[],
): Promise<IntentResult> {
  const projectList = projectNames.length > 0
    ? `User's existing projects: ${projectNames.join(', ')}`
    : 'User has no projects yet.'

  const componentList = currentComponents && currentComponents.length > 0
    ? `Current page components: ${currentComponents.join(', ')}`
    : ''

  const systemPrompt = `${INTENT_PROMPT}\n\n${projectList}\n${componentList}`

  try {
    const text = await callBubLLM(
      [{ role: 'user', content: message }],
      systemPrompt,
      200,
    )

    try {
      return JSON.parse(text.trim())
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]) } catch {}
      }
    }
  } catch {
    // Intent detection failure shouldn't block chat
  }

  return { action: 'none' }
}
