# Feature: Rename project via chat

## Source
User said "rename the site Mother Earth's Plantasia" — Bub acknowledged but there's no rename action wired up.

## Problem
No intent detection for renaming projects. Need a `rename_project` action.

## Suggestion
Add to intent detection: `{"action":"rename_project","newName":"..."}`. Server-side handler updates the project name and slug.

## Priority
Medium — nice to have, not blocking.
