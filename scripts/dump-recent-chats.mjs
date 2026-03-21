import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const { neon } = require('/Users/command/Desktop/bub/app-bub/node_modules/@neondatabase/serverless');

// Read DB URL from .dev.vars
let dbUrl = process.env.DEV_DATABASE_URL;
if (!dbUrl) {
  try {
    const vars = readFileSync('/Users/command/Desktop/bub/app-bub/.dev.vars', 'utf-8');
    const match = vars.match(/DEV_DATABASE_URL=(.+)/);
    if (match) dbUrl = match[1].trim();
  } catch {}
}
if (!dbUrl) {
  process.exit(0);
}

const sql = neon(dbUrl);

// Only get messages from the most recent active user (not all users)
const messages = await sql`
  SELECT m.role, m.content, m.created_at
  FROM messages m
  JOIN chats c ON m.chat_id = c.id
  WHERE m.created_at > NOW() - INTERVAL '24 hours'
  AND c.user_id = (
    SELECT user_id FROM chats ORDER BY updated_at DESC LIMIT 1
  )
  ORDER BY m.created_at DESC
  LIMIT 30
`;

if (messages.length === 0) {
  process.exit(0);
}

const formatted = messages.reverse().map(m =>
  `[${m.role}] ${m.content.substring(0, 300)}`
).join('\n---\n');

console.log(formatted);
