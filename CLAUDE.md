# CLAUDE.md

## Instructions

- At the start of every session, read the most recent 2 days of memory files in `/memory` to get up to speed on context and decisions.
- Browser errors are automatically injected via a UserPromptSubmit hook. If you see "BROWSER ERRORS DETECTED" in context, fix the errors and clear the files in `app-bub/errors/` before addressing the user's request.
- NEVER run unfiltered DELETE, UPDATE, TRUNCATE, or DROP on any database table. Always filter by test user IDs (emails containing 'test-'). A PreToolUse hook will block unfiltered destructive operations.
- When cleaning up test data, always preserve the real user's data (lukedepass@gmail.com). Filter with WHERE clauses.
- Recent Bub chat messages are injected via a SessionStart hook. If you see "RECENT BUB CHAT MESSAGES" in context, review them for feature ideas. If you spot patterns, pain points, or requests that suggest a new feature, write a brief feature idea to `chat-review/feature-idea-N.md` (where N is the next number). Don't create duplicates — check existing files first. Only create ideas that are actionable and not already planned.
