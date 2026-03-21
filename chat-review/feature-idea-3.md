# Feature: Project context in chat

## Source
User created "Mother Earth's Plantasia" but in subsequent messages Bub didn't seem aware of the active project context. User had to re-explain.

## Problem
After a project is created, Bub should know which project is active and be able to reference its components, pages, and items without the user repeating themselves.

## Suggestion
When a project is created or the iframe shows a project, inject project context into the system prompt:
- Project name, slug, status
- List of pages and their components
- List of content types and item counts

This way "add a contact form" or "change the hero image" just works without "which project?"

## Priority
Medium — becomes critical once users have multiple projects.
