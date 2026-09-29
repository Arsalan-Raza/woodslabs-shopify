# WoodSlabs — Shopify Pilot Project

## Setup profile
Preset: A — Full client build. Features: git=yes, github=yes, board=yes,
client-comms=no, docs=full, assets=yes. Source of truth: .project.env.

## Project
Paid pilot ($300 fixed). Goal: custom product configurator with server-side
dynamic pricing for Material Type 10. Success leads to full 10-material project
(68,000+ price points). See docs/project-plan.md for full requirements.

## Hard rules
- Research before coding: look up schema keys, Liquid and GraphQL in theme/
  or the Dev MCP. Shopify changes faster than training data.
- Never push to the published theme. Always pass --store and --theme.
- Never commit secrets. Private values live in .project.local.env.
- /assets/ is gitignored — work from it locally only.
- The board is the source of truth for task status.
- Claude moves tasks to Needs QA at most. Only the developer sets Done.
- Pricing data must never be exposed in client-side JavaScript.
- Draft orders are forbidden — use native Shopify cart only.
- Never commit the docx/ folder (client data, not for public repo).

## Architecture (read before touching any code)
- Price lookup: server-side only via App Proxy (Node.js on Railway + MySQL)
- Price signing: HMAC-SHA256 token prevents cart price tampering
- Checkout price enforcement: Shopify Cart Transform Function
- Configurator: custom Liquid section + vanilla JS (no framework)
- CSV import: password-protected admin page on app server
- See docs/project-plan.md §2 for full architecture diagram

## MCP servers
shopify-dev-mcp — schema lookup, Liquid docs, Theme Check (validate_theme),
GraphQL introspection, docs search. Call learn_shopify_api at the start of
each session — the other tools need its conversation ID.

## How we write theme code
- Prefix every file and CSS class with `wood-`: sections/wood-configurator.liquid,
  assets/wood-main.css, .wood-hero__title
- Layer order: settings → JSON composition → new wood- blocks → new wood- sections
  → editing theme files (last resort, log every edit in patch log)
- CSS: use var(--…) tokens, not raw hex. One {% stylesheet %} per file.
- Schema: look up every key before writing. Wrong keys silently do nothing.
- Never rebuild header, footer, cart drawer, variant picker, buy buttons, media
  gallery, search, or product cards — style them, don't replace them.

## Standing workflows
/task-done — commit, push theme, move issue to Needs QA, log patches.
/daily     — run scripts/daily-report.sh, show output to developer.

## Store facts
Store:   pilot-project-mwsx4wcj.myshopify.com
Theme:   Mat10 Pilot Dev
Country: United States  Currency: USD
Board:   https://github.com/users/Arsalan-Raza/projects/1
Repo:    https://github.com/Arsalan-Raza/woodslabs-shopify
Preview password: see .project.local.env

## Settled facts
- Material Type 10: unfinished finish only (no finished option)
- Shelf with hardware: available for depths 3–6", 6.1–12", 12.1–16" only
- Thickness placeholders (0.5", 0.75", 1", 1.5"): price=$1967, placeholder=yes
  → show as "Coming Soon", not selectable
- Width range: 9–96" whole + 1/16th fraction; fraction → round UP for pricing
- Depth range: 3–28" mapped to 6 pricing ranges; fraction → round UP then remap
- At ceiling values (width 96", depth 28", thickness 4" or 6") → fraction
  dropdown must be disabled
- Fractions recorded on order for manufacturing but do not affect price lookup

## Patch log
<!-- Log every edit to a non-prefixed theme file here: file | what | why | date -->
