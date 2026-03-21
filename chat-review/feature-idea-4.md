# Feature: Tech stack questions are wrong for Bub

## Source
Bub asks "What tech stack do you prefer? HTML/CSS/JS? React/Next.js? WordPress?" when user asks to build something.

## Problem
Bub IS the tech stack. Users shouldn't need to choose between React and HTML — Bub uses its own component system (JSON + pre-built components). These questions leak implementation details that the user shouldn't care about.

## Suggestion
Remove all tech stack questions from Bub's responses. Update system prompt: "Never ask the user about tech stacks, frameworks, or implementation details. You handle all technical decisions internally. Ask about what the user wants the site to DO and LOOK like, not how it's built."

## Priority
High — confuses non-technical users and wastes time for technical ones.
