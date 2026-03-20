# Bub Architecture

## Apps

| App | Domain | Framework | Purpose |
|-----|--------|-----------|---------|
| **www** | www.bub.ai | TanStack Start | Marketing site / landing pages |
| **app** | app.bub.ai | TanStack Start (w/ Query) | Dashboard, chat, agent management |

## Auth

- JWT signed/verified via Web Crypto API
- Stored in HttpOnly cookie on `.bub.ai` (shared across subdomains)
- No third-party auth provider — custom implementation

## LLM Provider Strategy (BYOK)

User provides their own keys. App is provider-agnostic.

| Provider | Key Type | Models |
|----------|----------|--------|
| Claude (Anthropic) | API key | Opus, Sonnet, Haiku |
| Claude (OAuth) | OAuth token | Same |
| Ollama | API endpoint | User's local models |

- Keys encrypted at rest (Web Crypto AES-GCM)
- Stored per-user in DB
- Unified adapter layer normalizes provider differences

## Runtime — Cloudflare Workers

| Layer | Service |
|-------|---------|
| **www** | Cloudflare Pages |
| **app** | Cloudflare Pages (w/ Workers functions) |
| **API** | Cloudflare Workers |
| **DB** | D1 (SQLite) or Turso |
| **KV** | Cloudflare KV (sessions, cache) |
| **Queue** | Cloudflare Queues (agent task dispatch) |
| **Durable Objects** | Long-running agent state / chat sessions |

## Core Flow

1. User logs in via **app.bub.ai** (JWT cookie set on `.bub.ai`)
2. User configures LLM provider + API key
3. User chats — messages hit Workers API
4. Workers dispatch agent tasks via Queues
5. Agents stream responses back via SSE
6. Agents can create/modify apps, execute code tasks

## Open Questions

- Can Durable Objects handle long-running agent orchestration, or do we need an external runtime for heavy tasks?
- Ollama is local — how does a Cloudflare Worker talk to a user's local Ollama? (Needs a local relay/tunnel?)
- Code execution sandboxing — where do agents actually run code?
- Database choice: D1 vs Turso vs both?
