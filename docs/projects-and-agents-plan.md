# Projects & Agents Plan

## What Is a Project?
A project is a website built through conversation with Bub. Instead of generating raw HTML/CSS, projects are defined as JSON structures that reference a pre-built component library. The LLM picks components and configures them — it doesn't write code.

## Core Insight
There are really only ~20 components on the web, restyled. A navbar is a navbar. A hero is a hero. Rather than having the LLM generate inconsistent HTML every time, we give it a menu of battle-tested, responsive, pre-built components. It just configures them.

---

## Page Structure (JSON)

A page is an ordered list of components with props and style overrides:

```json
{
  "page": "home",
  "components": [
    {
      "type": "navbar",
      "props": {
        "logo": "Mother Earth's Plantasia",
        "links": ["Home", "Products", "About"],
        "style": { "bgColor": "#2d5016", "textColor": "#fff" }
      }
    },
    {
      "type": "hero",
      "props": {
        "title": "Welcome to Mother Earth's Plantasia",
        "subtitle": "Rare plants for rare people",
        "bgImage": "/images/hero.jpg",
        "style": { "height": "80vh", "overlay": "dark" }
      }
    },
    {
      "type": "embed",
      "props": {
        "provider": "spotify",
        "url": "https://open.spotify.com/album/...",
        "style": { "maxWidth": "600px", "centered": true }
      }
    },
    {
      "type": "item-grid",
      "props": {
        "query": { "type": "product", "limit": 3, "order": "random" },
        "columns": 3,
        "card": "product-card",
        "style": { "gap": "24px", "padding": "48px" }
      }
    },
    {
      "type": "footer",
      "props": {
        "text": "© 2026 Mother Earth's Plantasia",
        "links": ["Privacy", "Contact"],
        "style": { "bgColor": "#1a1a1a", "textColor": "#888" }
      }
    }
  ]
}
```

---

## Component Library (~20 components)

Pre-built in React + Tailwind. Each component is responsive, tested, and accepts a standard `props` + `style` interface.

| Component | What it does | Key props |
|-----------|-------------|-----------|
| `navbar` | Logo + nav links | logo, links, sticky, transparent |
| `hero` | Big banner with CTA | title, subtitle, cta, bgImage, overlay |
| `text-block` | Rich text section | heading, body, alignment |
| `image` | Single image | src, alt, caption, rounded |
| `image-gallery` | Grid/carousel of images | images[], columns, layout |
| `item-grid` | Query items → card grid | query, columns, card style |
| `item-list` | Query items → list | query, layout |
| `item-detail` | Single item full view | itemId, layout |
| `card` | Generic card | image, title, text, link |
| `embed` | YouTube/Spotify/Twitter/iframe | provider, url |
| `form` | Contact/newsletter | fields[], submitLabel, action |
| `cta` | Call-to-action banner | title, subtitle, buttonText, buttonUrl |
| `features` | Icon + text grid | items[]{icon, title, text}, columns |
| `testimonials` | Quotes grid/carousel | items[]{quote, author, image} |
| `pricing` | Pricing tier cards | tiers[]{name, price, features[], cta} |
| `faq` | Accordion Q&A | items[]{question, answer} |
| `footer` | Links + copyright + social | text, links[], social[] |
| `sidebar` | Side panel with widgets | widgets[] |
| `divider` | Spacing/line | height, line, color |
| `html` | Raw HTML escape hatch | content |

---

## Style System (Design Tokens, not CSS)

Components don't accept raw CSS. They accept design tokens that map to Tailwind classes:

```json
{
  "bgColor": "#2d5016",
  "textColor": "#fff",
  "padding": "48px",
  "maxWidth": "1200px",
  "centered": true,
  "rounded": "lg",
  "shadow": "md",
  "font": "serif"
}
```

### Global Theme
Each project has a theme that applies defaults across all components:

```json
{
  "theme": {
    "primaryColor": "#2d5016",
    "secondaryColor": "#8b4513",
    "bgColor": "#ffffff",
    "textColor": "#1a1a1a",
    "font": "Inter",
    "headingFont": "Playfair Display",
    "rounded": "md",
    "maxWidth": "1200px"
  }
}
```

Component-level styles override the theme.

### Why design tokens instead of CSS:
- LLM can't mess up CSS (no conflicts, no broken layouts)
- Consistent quality — every site looks professional
- Theming is trivial — change primaryColor and it flows everywhere
- "Make the footer blue" → change one JSON value, not parse/edit CSS
- Site import: LLM maps colors/fonts to tokens instead of recreating CSS

---

## Content System (Generic CMS)

### Content Types (User-Defined)
```
content_types:
  id (uuid)
  project_id (references projects)
  name (text) — "Product", "Post", "Animal"
  slug (text) — "product", "post", "animal"
  fields (jsonb) — field definitions
  created_at (timestamp)
```

**Field types:** `text`, `richtext`, `number`, `boolean`, `image`, `date`, `url`, `select`

**Example fields for "Product":**
```json
[
  { "name": "title", "type": "text", "required": true },
  { "name": "price", "type": "number" },
  { "name": "description", "type": "richtext" },
  { "name": "image", "type": "image" },
  { "name": "category", "type": "select", "options": ["Indoor", "Outdoor", "Rare"] },
  { "name": "featured", "type": "boolean" }
]
```

### Items (Content Entries)
```
items:
  id (uuid)
  project_id (references projects)
  content_type_id (references content_types)
  data (jsonb) — actual field values
  status (text) — "draft" | "published"
  sort_order (int)
  created_at (timestamp)
  updated_at (timestamp)
```

### How Components Query Items
Components like `item-grid` have a `query` prop:

```json
{
  "type": "item-grid",
  "props": {
    "query": {
      "type": "product",
      "filter": { "featured": true },
      "limit": 3,
      "order": "random"
    },
    "columns": 3
  }
}
```

The serving layer resolves this query at render time (or pre-render time).

---

## DB Schema

```
projects:
  id (uuid)
  user_id (references users)
  name (text)
  slug (text, unique)
  description (text)
  theme (jsonb) — global design tokens
  custom_domain (text, nullable)
  status (text) — "creating" | "live" | "error" | "archived"
  created_at (timestamp)
  updated_at (timestamp)

project_pages:
  id (uuid)
  project_id (references projects)
  name (text) — "Home", "About", "Products"
  slug (text) — "home", "about", "products"
  components (jsonb) — ordered array of component instances with props
  sort_order (int)
  created_at (timestamp)
  updated_at (timestamp)

content_types:
  id (uuid)
  project_id (references projects)
  name (text)
  slug (text)
  fields (jsonb)
  created_at (timestamp)

items:
  id (uuid)
  project_id (references projects)
  content_type_id (references content_types)
  data (jsonb)
  status (text) — "draft" | "published"
  sort_order (int)
  created_at (timestamp)
  updated_at (timestamp)
```

Note: Components live inside `project_pages.components` as JSON, not their own table. A page IS its component list. This keeps edits atomic — update one page's JSON, done.

---

## Chat → Agent Interaction

### Intent Detection
- **Create project**: "build me a site", "replicate this site: [url]"
- **Edit component**: "make the footer blue", "add a Spotify embed to the homepage"
- **Add component**: "add a pricing section to the homepage"
- **Remove component**: "remove the testimonials section"
- **Manage content**: "create a Product type", "add a product called Monstera"
- **Query content**: "show 3 random products on homepage"

### Agent Tools
```
createProject(name, description, theme?) → project
importSite(url) → scrape + analyze + create project

getPage(projectId, pageSlug) → page with components JSON
updatePage(pageId, components) → save new components JSON
createPage(projectId, name, slug) → new page

createContentType(projectId, name, fields)
createItem(contentTypeId, data)
queryItems(contentTypeId, filter?, limit?, order?)

deploy(projectId) → pre-render all pages, push to KV/R2
```

### How "make the footer blue" works:
1. Chat detects edit intent + target ("footer" component)
2. Sends to LLM: "Here's the current page JSON. The user wants the footer to be blue. Return the updated JSON."
3. LLM changes `footer.props.style.bgColor` to blue
4. Bub saves the updated page JSON
5. Auto-redeploy
6. "Done! Footer is now blue."

The LLM edits JSON, not HTML. Way simpler and more reliable.

---

## Site Import (from URL)

1. **Scrape** — Fetch homepage + key pages
2. **Send to LLM** — "Here's the HTML of this site. Map it to our component library. For each section, tell me which component type it is and what the props should be. Also identify content types (products, posts, etc.)."
3. **LLM returns JSON** — Component list per page + content type definitions
4. **Download images** — Re-host in R2
5. **Create project** — Theme + pages + content types + items
6. **Deploy**

The LLM's job is pattern matching (this looks like a hero, this looks like a product grid), not code generation. Much more reliable.

---

## Serving Architecture

### Pre-render on deploy
When a project deploys:
1. For each page, resolve all item queries
2. Render React components to static HTML
3. Store in KV (key: `{slug}:{page}`, value: rendered HTML)
4. Invalidate old cache

### Worker routing
```
Request: https://plantasia.bub.ai/products
  ↓
Worker extracts slug: "plantasia"
  ↓
Reads pre-rendered HTML from KV: "plantasia:products"
  ↓
Returns response (fast, no DB hit)
```

### When items change
If a user adds/edits/deletes an item, re-render affected pages (pages that query that content type) and update KV.

---

## Component Versioning
Each page save stores the previous `components` JSON. Simple:

```
page_versions:
  id (uuid)
  page_id (references project_pages)
  components (jsonb) — previous state
  created_at (timestamp)
```

"Undo that change" → restore previous version's JSON.

---

## Open Questions

1. **Server-side rendering** — Where does the React component library live for pre-rendering? A build step that SSRs each page? Or keep it client-side and the "pre-render" is just the component JSON + a client-side React app?

2. **Component library distribution** — The React components need to be available both in the serving Worker (for rendering) and potentially in the app (for preview). Shared package?

3. **Images** — Upload flow? R2 direct upload from the CMS UI? Presigned URLs?

4. **Escape hatch** — The `html` component handles custom stuff, but how far do we let users go? Script tags? Iframes only?

5. **Inter-component communication** — What if the navbar needs to know all pages to generate links? Need a page manifest passed to components.

6. **Forms** — Where do form submissions go? A generic submissions table? Webhook to external service?

---

## Implementation Steps

### Step 1: Component Library
- Build the ~20 React components with Tailwind
- Each accepts typed props + style tokens
- Test responsiveness

### Step 2: DB Schema + CRUD
- Add projects, project_pages, content_types, items tables
- Server functions for all CRUD operations

### Step 3: Page Renderer
- Takes page JSON → renders React components → outputs HTML
- Client-side first (show in iframe), then add pre-rendering

### Step 4: Chat Integration
- Intent detection for project/component/content operations
- Agent tools that manipulate page JSON
- Auto-deploy on changes

### Step 5: Serving Worker
- `*.bub.ai` wildcard routing
- Serve pre-rendered pages from KV

### Step 6: Site Import
- URL scraping + LLM analysis
- Map to component library
- Image re-hosting

### Step 7: CMS UI
- Content type manager
- Item editor (in iframe)
- Visual page builder (drag/reorder components) — stretch goal
