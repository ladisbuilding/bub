# Feature: "show me the site" doesn't always work

## Source
User said "show me the site" and Bub responded with text ("Showing you the site now! Take a look!") but the navigation didn't always trigger. User had to ask "do I click view site?"

## Problem
The NAVIGATE intent detection may not fire reliably on every phrasing. Also, Bub's text response implies the user should already be seeing it, creating confusion.

## Suggestion
1. When NAVIGATE triggers, Bub's response should say "I've opened your site in the viewer" — not "Take a look!" which implies it happened automatically
2. Test more phrasings: "show me the site", "show me my site", "let me see it", "open it", "preview the site"
3. Consider: if no navigation happened, Bub should say "Click View Site on the project page to see it"

## Priority
High — core interaction pattern.
