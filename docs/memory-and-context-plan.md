# Memory & Context Plan

## Problem
Users want to reference past conversations naturally ("remember when we researched auth providers?") and get accurate, detailed responses.

## Approach: Summarization + Vector Search

### How It Works

```
User sends message
  ↓
Does it reference the past? (keyword check: "remember", "last time", "before", etc.)
  ↓
If yes → embed query via Workers AI → search Vectorize → get matching summaries
  ↓
Inject summaries into system prompt as context
  ↓
Send to AI provider → AI responds with awareness of past conversations
```

### When Summaries Are Created
- When a chat goes inactive (no new messages for 30 minutes)
- Durable Object alarm triggers summary generation using the user's AI provider
- Summary is embedded via Workers AI and stored in Vectorize

---

## Components

### 1. Chat Summaries Table (Neon)

**`chat_summaries`**
- `id` (uuid)
- `chat_id` (references chats)
- `user_id` (references users)
- `summary` (text)
- `vectorize_id` (text)
- `created_at` (timestamp)

### 2. Cloudflare Vectorize

- Index: `bub-chat-summaries`, 768 dimensions, cosine similarity
- Metadata per vector: `user_id`, `chat_id`, `summary_id`
- Embedding model: Workers AI `@cf/baai/bge-base-en-v1.5` (free)

### 3. Retrieval (only when needed)

**Keyword heuristic** — only search if message contains: "remember", "last time", "before", "earlier", "we discussed", "we talked about", "that thing", "go back to", "previous", "ago"

**Flow:**
1. Embed user message via Workers AI
2. Query Vectorize (top 3, filtered by `user_id`)
3. If similarity > threshold, load summary from Neon
4. Inject into system prompt

**Injection format:**
```
## Past Context
[January 2, 2026] You were researching auth providers. Compared Clerk, Auth.js, and custom JWT. Decided on custom JWT for Cloudflare Workers compatibility.
```

---

## Infrastructure

| Component | Service | Cost |
|-----------|---------|------|
| Summaries table | Neon Postgres (existing) | Free tier |
| Vector index | Cloudflare Vectorize | Free (5M vectors) |
| Embedding model | Cloudflare Workers AI | Free |
| Summary generation | User's AI provider | Their API key |
| Inactivity trigger | Durable Object alarm | Free |

---

## Implementation

### Step 1: Schema
- Add `chat_summaries` table
- Create Vectorize index

### Step 2: Summary Generation
- Durable Object that tracks chat activity
- After 30 min inactivity: generate summary, embed it, store in Vectorize

### Step 3: Retrieval
- Keyword check on incoming messages
- Embed → search Vectorize → inject into system prompt
