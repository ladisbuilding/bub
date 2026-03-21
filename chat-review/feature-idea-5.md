# Feature: Bub says it did things but didn't actually do them

## Source
User asked for Spotify player, Bub said "Done! I've added the Spotify embed" — but no component was actually created or added to the project page. Bub is just generating conversational text without executing any actions.

## Problem
The intent detection creates projects and navigates, but there's no tool for editing project content yet. Bub confidently says "I added the Spotify player" when it has no ability to modify page components.

## Suggestion
Either:
1. Add component editing tools (add/remove/edit components on a page) and wire them into intent detection
2. Or have Bub honestly say "I can't edit your site yet, but here's what it would look like" instead of claiming it did something

## Priority
Critical — this is trust-breaking. Users will lose confidence if Bub claims to do things it can't.
