# Feature: "Show me the site" command

## Source
User said "show me the site" and expected Bub to display their project in the content iframe. Instead, Bub generated inline code.

## Problem
Bub doesn't know how to navigate the content iframe. When user says "show me the site" or "show me the project", Bub should navigate the iframe to `/site/{slug}` — not generate code.

## Suggestion
Add a `[NAVIGATE: /site/{slug}]` tag (similar to `[CREATE_PROJECT]`) that the chat parses and triggers `onNavigate`. Bub's system prompt should know about this tool.

## Priority
High — this is a core UX expectation.
