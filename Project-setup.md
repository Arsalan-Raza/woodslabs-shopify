# SHOPIFY PROJECT SETUP — INTERACTIVE BOOTSTRAP

A reusable setup guide for any Shopify build, any store, any GitHub account.
Give this file to Claude Code at the start of a new project:

    claude "Read shopify-setup.md and run the setup interview"

Claude interviews the developer first, then builds only the parts they chose.
Nothing is created before the developer approves the summary.

---

## PART 0 — INSTRUCTIONS FOR CLAUDE (READ BEFORE DOING ANYTHING)

1. **Interview first, build second.** Do not create files, run `git`, run `gh`,
   or run `shopify` commands until Part 1 is complete and the developer has
   confirmed the summary in 1.8.
2. **Ask with the AskUserQuestion tool** if it is available (tappable options).
   Otherwise ask as a short numbered list. Max 4 questions per round. Always
   show the default so the developer can just accept it.
3. **Skip what doesn't apply.** If a preset or an earlier answer already
   decides a question, don't ask it — list it in the summary instead.
4. **Detect existing state before asking.** Check for `.git/`, `CLAUDE.md`,
   `theme/`, `docs/`, `.mcp.json`, `.project.env`. If found, tell the
   developer what exists and ask: *resume / extend / start over*. Never
   overwrite an existing file without an explicit yes.
5. **Things Claude never does, regardless of answers:**
   - Create or delete a Shopify store (developer does this in the dashboard)
   - Send any message to a client
   - Push to the live/published theme
   - Create a **public** repo unless the developer typed "public" explicitly
   - Delete repos, branches, themes, or client files
   - Put passwords, tokens, or API keys in any committed file
6. **Placeholders** used below — fill them from the interview:
   `{{BRAND}}` `{{PREFIX}}` `{{STORE}}` (the `xxx.myshopify.com` domain)
   `{{THEME_NAME}}` `{{GH_OWNER}}` `{{REPO}}` `{{QA_PERSON}}`

---

## PART 1 — THE INTERVIEW

### 1.1 Round 1 — Project type (sets the defaults)

**Q1. What kind of project is this?**

| Preset | Use for | Defaults it sets |
|---|---|---|
| **A. Full client build** | Paid client work with milestones | Everything ON |
| **B. Lightweight client** | Small fix/section jobs, quick gigs | Git + docs (minimal), no board, no client log |
| **C. Sample / demo store** | Portfolio, testing, learning, pitch mockups | Git local only, no client folders, no QA gate |
| **D. Custom** | Pick everything yourself | Ask every question below |

Full default matrix (developer can override any row in later rounds):

| Feature | A | B | C |
|---|---|---|---|
| Git | GitHub, private | GitHub, private | Local only |
| GitHub Project board | Yes | No | No |
| Client comms folder (`client-log`, replies) | Yes | No | No |
| Docs folder | Full | Minimal | Minimal |
| `/assets/` client-asset folder | Yes | Yes | No |
| Scripts | All four | store-auth only | store-auth only |
| Shopify Dev MCP | Yes | Yes | Yes |
| QA gate (only QA person sets Done) | Yes | No | No |
| Client block + contract rules in CLAUDE.md | Yes | Short | No |

### 1.2 Round 2 — Identity

- **Q2. Brand / project name?** (e.g. "Cruvheal")
- **Q3. File & class prefix?** Suggest the first 4–5 lowercase letters of the
  brand + hyphen (e.g. `cruv-`). Must be lowercase, letters only, end in `-`,
  and must not match an existing Horizon/Dawn prefix. Confirm with developer.
- **Q4. Does the store already exist?**
  - Yes → ask for the `xxx.myshopify.com` domain.
  - No → give the developer the store checklist in Step F and wait until they
    paste back the domain. Do not continue theme steps without it.
- **Q5. Working theme name in admin?** Default: `{{BRAND}} M1`.

### 1.3 Round 3 — Version control

- **Q6. Git?**
  - `GitHub remote` (default A/B)
  - `Local git only` (default C)
  - `No git` — warn once: no revert for rejected design directions, no
    safety net for theme pulls. Accept their answer.
- If GitHub:
  - **Q7. GitHub owner?** Run `gh auth status` and `gh api user/orgs --jq '.[].login'`
    first, then offer the personal account + each org as options.
  - **Q8. Repo name?** Default: `{{brand}}-shopify` (lowercase, hyphenated).
  - **Q9. Visibility?** Default `private`. Only `public` if typed explicitly;
    if public, remind that client assets, preview passwords, and client
    conversation must never be committed.
  - **Q10. GitHub Project board?** (only offered if GitHub)

### 1.4 Round 4 — Folders

- **Q11. Client communication folder?** (`docs/client-log.md` + `docs/replies/`)
  Yes / No. If No, all client-comms rules are left out of CLAUDE.md.
- **Q12. Docs folder?**
  - `Full` — project-plan, action-plan, theme-guide, workflow + patch log
  - `Minimal` — workflow + patch log only (the patch log is what makes theme
    updates survivable, so recommend keeping at least this)
  - `None`
- **Q13. Local `/assets/` folder for client files (photos, copy, data)?**
  Yes / No. If Yes it is always gitignored.

### 1.5 Round 5 — Tooling

- **Q14. Which scripts?** (multi-select)
  - `store-auth.sh` — safe login to the right store (recommended always)
  - `board.sh` — move board issues from the terminal (needs board)
  - `daily-report.sh` — daily progress report from issues (needs board)
  - `asset-check.sh` — detect new client files (needs `/assets/`)
- **Q15. Shopify Dev MCP (`.mcp.json`)?** Default Yes.
- **Q16. Theme base?**
  - `Horizon — download from store` (default)
  - `Existing theme already on the store` (ask its exact name)
  - `Dawn` / other (ask name)
- **Q17. Where do daily reports go?** Upwork / email / Slack / none.
  (Only if daily-report selected. Reports are always generated as a file for
  the developer to paste — never auto-posted.)

### 1.6 Round 6 — Client details (only if Preset A/B or Q11 = Yes)

- **Q18.** Client name, contract value (optional), milestones, revision rounds.
- **Q19.** QA person — who is allowed to mark issues Done? (name/role)
- **Q20.** Topics the client said never to mention or promise
  (e.g. a competitor, shipping timelines, a marketplace). Free text, may be empty.
- **Q21.** External platforms Claude may *read* but never change
  (e.g. Seller Central, Klaviyo). Free text, may be empty.
- **Q22.** Store country / currency, if the store isn't created yet.

### 1.7 Dependency rules (enforce silently, mention in summary)

- No Git → no GitHub, no board, no `.gitignore`, no tags, no `git` in any script.
- No GitHub → no board, no `board.sh`, no `daily-report.sh`.
- No board → QA gate is written as a plain rule in CLAUDE.md instead.
- No client comms folder → no `/client-msg` workflow, no reply drafts.
- No `/assets/` → no `asset-check.sh`.
- Docs = None → patch log lives in a section at the bottom of CLAUDE.md.

### 1.8 Confirmation

Show a summary like this and wait for "yes" (or edits):

```
Project:   Cruvheal  (Preset A — Full client build)
Prefix:    cruv-
Store:     cruvheal-x7k2.myshopify.com   Theme: "Cruvheal M1" (Horizon, store download)
Git:       GitHub  algo-encoders/cruvheal-shopify  (private)
Board:     Yes — Blocked → Todo → In Progress → Needs QA → Done
Folders:   docs/ (full), client comms, /assets/ (gitignored)
Scripts:   store-auth, board, daily-report, asset-check
MCP:       shopify-dev-mcp
QA:        Abdul sets Done
Skipped:   —
```

Then save the answers to `.project.env` (Step E) so every later session and
script reads the same values.

---

## PART 2 — SETUP STEPS (RUN ONLY THE ONES THAT APPLY)

Tick each step off in the final report (Step L). Skipped steps are listed as
"skipped — reason".

### Step A — Git  `[if Git ≠ No]`

```bash
git init -b main
git commit --allow-empty -m "init"
```

### Step B — GitHub repo  `[if GitHub]`

Ask for confirmation before running — this creates something on GitHub.

```bash
gh repo create {{GH_OWNER}}/{{REPO}} --private --source=. --remote=origin --push
```

(`--public` only if chosen explicitly in Q9.)

### Step C — GitHub Project board  `[if board]`

1. Ensure scope: `gh auth refresh -s project`
2. Create: `gh project create --owner {{GH_OWNER}} --title "{{BRAND}} Shopify"`
3. Link repo: `gh project link <number> --owner {{GH_OWNER}} --repo {{GH_OWNER}}/{{REPO}}`
4. Columns, in this order: **Blocked → Todo → In Progress → Needs QA → Done**.
   The default Status field only has Todo / In Progress / Done. Ask the
   developer to add "Blocked" and "Needs QA" in the board UI (Settings →
   Status field), then continue.
5. Read the IDs and store them in `.project.env`:
   ```bash
   gh project view <number> --owner {{GH_OWNER}} --format json --jq .id
   gh project field-list <number> --owner {{GH_OWNER}} --format json
   ```
   Save `PROJECT_ID`, `STATUS_FIELD_ID`, and one option ID per column.

Rule written into CLAUDE.md: Claude moves issues up to **Needs QA** only.
Only {{QA_PERSON}} sets **Done**.

### Step D — .gitignore  `[if Git]`

```
# client files — never committed (confidentiality + repo size)
/assets/
# local secrets
.project.local.env
.DS_Store
*.zip
node_modules/
.venv/
```

Drop the `/assets/` line if Q13 = No. If the repo is **public**, also add
`docs/client-log.md` and `docs/replies/` even if those folders exist.

### Step E — Project config files  `[always]`

`.project.env` — committed, no secrets. All scripts `source` it.

```bash
BRAND="{{BRAND}}"
PREFIX="{{PREFIX}}"
STORE="{{STORE}}"
THEME_NAME="{{THEME_NAME}}"
GH_OWNER="{{GH_OWNER}}"      # empty if no GitHub
REPO="{{REPO}}"              # empty if no GitHub
PROJECT_NUMBER=""            # board only
PROJECT_ID=""
STATUS_FIELD_ID=""
OPT_BLOCKED=""
OPT_TODO=""
OPT_IN_PROGRESS=""
OPT_NEEDS_QA=""
OPT_DONE=""
# feature flags written from the interview
USE_GIT=yes|no
USE_GITHUB=yes|no
USE_BOARD=yes|no
USE_CLIENT_COMMS=yes|no
DOCS_LEVEL=full|minimal|none
USE_ASSETS=yes|no
```

`.project.local.env` — **gitignored**. Store preview password and anything
else private. If there's no git, it's still kept separate out of habit.

### Step F — Shopify store  `[developer does this manually]`

Only if the store doesn't exist yet. Show this checklist and wait:

- Partner / Dev dashboard → Stores → Create development store.
- **Set the country correctly at creation** (usually United States for US
  clients). Country is tied to the legal entity afterwards and support
  cannot change it. A wrong country (e.g. PK) blocks US shipping zones,
  payments and tax setup.
- Currency to match (usually USD).
- Name: `<brand>-<random>.myshopify.com`.
- Paste the domain back to Claude.

For sample stores (Preset C) the country still matters if you'll demo
checkout, shipping or tax — mention it, but don't block on it.

### Step G — Theme base  `[always]`

1. Log in to the right store first (Step I creates `store-auth.sh`; if the
   script is skipped, run `shopify auth logout` then
   `shopify theme list --store {{STORE}}`).
2. In admin, name the working theme `{{THEME_NAME}}` (duplicate the base
   theme if needed — never work on the published one).
3. Pull it:
   ```bash
   shopify theme pull --store {{STORE}} --theme "{{THEME_NAME}}" --path theme
   ```
4. `[if Git]` commit immediately:
   ```bash
   git add theme/ && git commit -m "base: <theme> <version> store download"
   ```

**Horizon note:** always use the *store download* as the base, not a GitHub
clone. The GitHub copy can lag by weeks and differ on 100+ files at the same
version string. A GitHub clone is fine as a read-only reference outside
`theme/`.

### Step H — Folders  `[per answers]`

```
docs/                          [if DOCS_LEVEL ≠ none]
  workflow.md                  daily loop, checklists, PATCH LOG     [minimal+]
  project-plan.md              scope, architecture decisions, why    [full]
  action-plan.md               build order, milestones, blockers     [full]
  theme-guide.md               theme architecture read-out           [full]
  asset-manifest.txt           generated by asset-check.sh --save    [if assets]
  client-log.md                every client message, verbatim, dated [if client comms]
  replies/reply-001.txt …      draft replies, numbered               [if client comms]
  daily/YYYY-MM-DD.txt         daily reports                         [if daily-report]
assets/                        client files, gitignored              [if assets]
scripts/                       selected scripts                      [if any script]
```

Start each doc with a one-line purpose header, nothing more. They fill up
during the project.

### Step I — Scripts  `[per Q14]`

Every script starts with:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$0")/.."
source .project.env
```

(Use the `dirname` path when there's no git.) `chmod +x` each one.

**store-auth.sh** — modes: `all` (default), `theme`, `admin`, `check`.
- Logs out first (prevents pushing to another client's store), then theme
  session (`shopify theme list --store "$STORE"`), then admin session
  (`shopify store auth --store "$STORE" --scopes <list>`).
- Keep the scope list minimal. Exclude payouts, billing, staff, customer PII.
- Document every scope with a reason in `docs/store-auth-scopes.txt`
  (or a CLAUDE.md section if Docs = None).
- `check` prints the current store/theme session — run it before first push.

**board.sh** — `status <issue#> "<Status>"`, `show <issue#>`, `list "<Status>"`.
- Reads IDs from `.project.env`. Refuses `Done` unless run with `--qa` so the
  QA gate is enforced by the tool, not only by the rule.

**daily-report.sh** (+ `_report.py`) — writes `docs/daily/YYYY-MM-DD.txt`
from `gh issue list`, grouped by status. Developer reviews and posts it
manually to {{report channel}}. Never auto-posted.

**asset-check.sh** — diffs `assets/` against `docs/asset-manifest.txt`,
prints new / changed / removed files. `--save` updates the baseline after
review.

### Step J — `.mcp.json`  `[if Dev MCP]`

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

Project-scoped: Claude Code asks once per machine to approve it. Tell the
developer to restart the session after approval so the tools load.

### Step K — CLAUDE.md  `[always — build it from the template in Part 3]`

Include only the blocks whose condition is true. Leave out empty blocks
entirely — don't write "N/A".

### Step L — Verify and report  `[always]`

- `[if Git]` `git status` is clean and `assets/` is not tracked.
- `[if scripts]` run `scripts/store-auth.sh check`.
- `[if MCP]` confirm `.mcp.json` is valid JSON.
- Print a checklist: done / skipped (with reason) / needs developer action.
- `[if Git]` final commit: `chore: project setup`, and push if GitHub.

---

## PART 3 — CLAUDE.md TEMPLATE

`[tags]` show when each block is included. Remove the tags in the output.

```markdown
# {{BRAND}} — Shopify Project

## Setup profile
Preset: {{preset}}. Features: git={{}}, github={{}}, board={{}},
client-comms={{}}, docs={{}}, assets={{}}. Source of truth: .project.env.
If a feature is off, don't create its files or follow its workflow.

## Client            [client projects]
Client, brand, contract value, milestones, revision rounds.
Live site, store, repo, board links.

## Hard rules
- Research before coding: look up schema keys, Liquid and GraphQL in theme/
  or the Dev MCP. Shopify changes faster than training data.   [always]
- Never push to the published theme. Always pass --store and --theme.   [always]
- Never commit secrets. Private values live in .project.local.env.   [always]
- Confidentiality: client files and conversation stay out of the repo. [client]
- /assets/ is gitignored — work from it locally only.   [assets]
- The board is the source of truth for task status.   [board]
- Claude moves tasks to Needs QA at most. Only {{QA_PERSON}} sets Done. [QA gate]
- Claude never sends client messages; it drafts them in docs/replies/.   [client comms]
- Never mention / promise: {{Q20 list}}.   [if any]
- Read-only platforms: {{Q21 list}}.   [if any]

## Page design standard            [client projects; optional for demo]
Four lenses: SEO, GEO (AI visibility), AEO (answer engines), Conversion.
Minimum sections per template: home, collection, product, content, blog.

## MCP servers                     [if MCP]
shopify-dev-mcp — schema lookup, Liquid docs, Theme Check (validate_theme),
GraphQL introspection, docs search. Call learn_shopify_api at the start of
each session — the other tools need its conversation ID.

## How we write theme code         [always — Part 4 condensed]

## Standing workflows
/task-done — commit, push theme, move issue to Needs QA, log patches.   [always; board step if board]
/daily     — run daily-report.sh, show it to developer.                 [daily-report]
/client-msg — see Part 6.                                               [client comms]

## Settled facts
Brand colours, fonts, tokens, catalogue details, content yes/no rules,
imagery policy, scope decisions already made. Every "we decided X because Y"
goes here so no session re-derives it.

## Store facts
Store: {{STORE}}  Theme: {{THEME_NAME}}  Country/currency: {{}}
Preview password: see .project.local.env   (never in this file if repo is public)
Known quirks: …

## Patch log                         [only if Docs = None; else in docs/workflow.md]
```

---

## PART 4 — THEME CUSTOMISATION ARCHITECTURE (applies to every project)

### 4.1 The layers (lowest = preferred)

- **Layer 0 — Theme settings** (`config/settings_data.json`). Brand colours in
  the colour palette/schemes, type in the font roles. Horizon generates ~230
  CSS custom properties from these. Most "brand" changes cost nothing else.
- **Layer 1 — JSON composition.** Arrange stock sections/blocks in
  `templates/*.json`. No custom code.
- **Layer 2 — New `{{PREFIX}}` blocks** (default for custom components).
  `theme/blocks/{{PREFIX}}*.liquid`, added to existing sections.
- **Layer 3 — New `{{PREFIX}}` sections.** Only when it's a header/footer group
  component, needs template gating (`enabled_on`), owns its own Section
  Rendering endpoint, or owns a full-bleed grid.
- **Layer 4 — Editing a theme file.** Last resort. Every edit to a non-prefixed
  file goes in the **patch log** (file, what, why, date). At a theme version
  bump every patch must be re-applied by hand.

### 4.2 Naming

Prefix every file *and* CSS class you author with `{{PREFIX}}`:
`sections/{{PREFIX}}hero.liquid`, `blocks/{{PREFIX}}card.liquid`,
`assets/{{PREFIX}}main.css`, `.{{PREFIX}}hero__title`.
Horizon ships 500+ files and generic classes like `.menu` and `.cart` are
used hundreds of times — unprefixed classes collide silently. Grepping the
prefix is how you find everything that's yours at upgrade time.

### 4.3 CSS

- `{% style %}` for CSS containing Liquid; `{% stylesheet %}` for static CSS —
  exactly one per file (two is a syntax error).
- Use design tokens via `var(--…)`, not raw hex.
- No `!important` against theme styles — fix specificity instead.
- Raw brand values live only in `snippets/{{PREFIX}}tokens.liquid` (keep it short).

### 4.4 Schema

- `"tag": "section"` / `"header"` so the wrapper is the semantic element;
  `"tag": null` for no wrapper.
- `{{ block.shopify_attributes }}` on the outermost block element.
- `enabled_on` to restrict sections to the templates that need them.
- Look up every schema key before writing it. A wrong key silently does
  nothing — the hardest bug to spot.

### 4.5 Don't rebuild

Never replace the theme's header, footer, cart drawer, variant picker, buy
buttons, media gallery, search or product cards. That's where the JS, a11y
and cart state live. Style them; don't replace them.

---

## PART 5 — DAILY LOOP (git steps only if Git = yes)

**Start of day**
```bash
shopify theme pull --store "$STORE" --theme "$THEME_NAME" --path theme
git diff --stat theme/ && git commit -am "theme pull $(date +%F)"
```
Pull first — the client (or you, in the editor) may have changed
`templates/*.json` or `config/settings_data.json`. Pushing without pulling
overwrites them.

**During work**
```bash
shopify theme dev --store "$STORE" --path theme    # http://127.0.0.1:9292
```
Commit *before* starting a new design direction so a rejected direction is
one revert away. With limited revision rounds, that's what keeps them affordable.

**End of session**
```bash
git add theme/ && git commit -m "{{PREFIX}}<section>: <what changed>"
shopify theme push --store "$STORE" --theme "$THEME_NAME" --path theme
git push origin main        # if GitHub
```
Never a bare `shopify theme push`. Always `--store` and `--theme`.

**Milestones** `[if Git]` — tag what goes to the client:
`git tag m1-round1 && git push origin m1-round1`

**No git?** Before any risky change, `shopify theme duplicate` or
`shopify theme pull` into a dated backup folder instead.

---

## PART 6 — CLIENT COMMUNICATION  `[only if client comms = yes]`

When a client message arrives (`/client-msg`):
1. Log it verbatim in `docs/client-log.md` under a date header — before
   anything else.
2. If they mention uploading files → run `scripts/asset-check.sh`.  `[assets]`
3. Unblock board issues the message answers; open issues for new requests.  `[board]`
4. Draft the reply in `docs/replies/reply-NNN.txt`. The human sends it.
5. Check scope against the contract before implying any commitment. Never
   promise timelines or topics from the "never mention" list.

---

## PART 7 — COMMON MISTAKES

1. **Pushing to the wrong store** → always `--store`; run `store-auth.sh check` first.
2. **Overwriting editor changes** → pull before touching shared JSON files.
3. **Schema keys that do nothing** → look them up in `theme/` or the Dev MCP.
4. **CSS collisions** → prefix every class.
5. **Rebuilding commerce components** → style, don't replace.
6. **Two `{% stylesheet %}` tags** → one per file.
7. **Raw hex instead of tokens** → `var(--…)`; brand values in the tokens snippet.
8. **Committing client assets** → `/assets/` in `.gitignore`; check `git status`.
9. **Push without `--theme`** → always name the theme.
10. **Dev MCP tools failing** → call `learn_shopify_api` first in each session.
11. **Wrong store country** → set it at creation; it can't be changed later.
12. **Secrets in a public repo** → preview passwords and tokens only in `.project.local.env`.