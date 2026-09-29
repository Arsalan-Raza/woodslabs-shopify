# WoodSlabs — Shopify Pilot Project Plan
## Material Type 10 Configurator

---

## 1. What the Client Wants

### The Business Problem
The client sells custom-cut wood slabs and shelves made to order. Every order is unique — the price depends on the combination of material, finish, product type, hardware, thickness, depth, and width. There are 3,168 distinct price points for Material Type 10 alone. The full project will cover 10 material types and over 68,000 price points.

A standard Shopify product + variant setup cannot handle this. Variants are limited in count and cannot represent this many combinations. A custom configurator is required.

### Pilot Scope (Material Type 10 Only)
This pilot is a paid evaluation ($300). Success leads to the full 10-material project. The client needs to verify we can implement this correctly before committing to the full engagement.

### What Must Be Built

**1. Product Configurator UI**
A single unified order form section embedded on the product page. The customer selects:

| Field | Options |
|---|---|
| Material | Material Type 10 (fixed for pilot — no selection) |
| Finish | Unfinished only (no finished option exists for this material — field hidden or pre-set) |
| Product Type | Slab (no hardware) OR Shelf with Hardware |
| Thickness | 1.75", 2", 2.1–4" (range), 4.1–6" (range); plus 0.5", 0.75", 1", 1.5" marked "Coming Soon" (placeholder — slab only) |
| Width | Whole inches 9–96 (primary dropdown) + fractional 1/16th increments (secondary dropdown) |
| Depth | 6 pricing ranges: 3–6, 6.1–12, 12.1–16, 16.1–20, 20.1–24, 24.1–28 (customer selects their range) |

**2. Real-Time Dynamic Pricing**
- Price updates the moment any option changes — no page reload, no loading spinner that feels broken
- Prices come from a direct database lookup — no formula, no approximation
- Pricing data must NOT be exposed in client-side JavaScript
- Must feel completely native on desktop and mobile

**3. Availability Rules (Enforced Automatically in UI)**
- Finish: Unfinished only — no finished option shown
- Shelf with Hardware only available for depths 3–6", 6.1–12", 12.1–16"
  - Depths 16.1–20", 20.1–24", 24.1–28" → Slab only (hardware option hidden/disabled)

**4. Dimension Input Rules**

Width:
- Two dropdowns: whole inches (9–96) + fractional (1/16 through 15/16)
- If any fraction selected → round UP to next whole inch for pricing
- At 96" → fraction dropdown disabled (ceiling rule)

Depth:
- Customer selects from 6 pricing ranges
- Within each range: whole inch + fractional dropdown
- If fraction selected → round UP, then re-map to correct pricing range
- At 28" → fraction dropdown disabled (ceiling rule)
- Example: 6 and 1/16" → rounds to 7" → maps to 6.1–12 range

Thickness:
- 1.75" and 2" are fixed values — no fraction input
- 2.1–4" is a range — fraction input shown for order record only; prices as "2.1-4"; disabled at 4" (ceiling)
- 4.1–6" is a range — fraction input shown for order record only; prices as "4.1-6"; disabled at 6" (ceiling)
- 0.5", 0.75", 1", 1.5" — placeholder rows (price = $1,967, placeholder flag = yes); shown as "Coming Soon", not selectable

Fractions are recorded on the order for manufacturing but do not affect which price is looked up (only the round-up matters for pricing).

**5. Cart and Checkout**
- Correct price must carry through from configurator → cart → checkout
- Draft orders are explicitly forbidden (disrupts native Shopify cart experience)
- The native Shopify cart must be used

**6. CSV Import Tool**
- Password-protected page (no developer required for routine updates)
- Owner uploads a new CSV → full replace of the pricing database
- Must handle 3,168+ records accurately in a single operation
- Same CSV format as the provided file

---

## 2. How We Will Build It

### Architecture Overview

```
Customer Browser
      |
      | (1) Configuration change
      v
Theme Configurator JS  ──── App Proxy (HTTPS) ────> WoodSlabs App Server
      |                                                    |
      | (2) Price returned                           MySQL Database
      |                                             (slab_pricing table)
      | (3) Display updated
      |
      | (4) "Add to Cart"
      v
Shopify Cart API  ──── line item properties (config + signed price)
      |
      v
Shopify Checkout ──── Cart Transform Function (validates signed price → sets checkout price)
```

### Component Breakdown

**A. App Server (Node.js on Railway)**

A lightweight Node.js/Express app hosted on Railway.app (free tier sufficient for pilot):

- `/api/price` endpoint — receives config params, queries MySQL, returns price + HMAC signature
- `/admin/import` — password-protected CSV import page
- MySQL database with the `slab_pricing` table (loaded from the provided SQL file)
- Accessible to the Shopify store via Shopify App Proxy (store proxies `/apps/woodslabs/*` → app server)

Why Railway: zero-config MySQL included, deploys in minutes, no DevOps overhead for a pilot.

**B. Shopify App**

A basic Shopify custom app registered in the Partner Dashboard that:
- Establishes the App Proxy route (`/apps/woodslabs/` → app server)
- Provides the Cart Transform Function extension (for checkout price enforcement)

The app does NOT need a UI dashboard for the pilot — just the proxy and the function.

**C. Theme Configurator Section**

A new Liquid section (`sections/wood-configurator.liquid`) embedded on the product page template:

- Renders the full form: product type, thickness, width (whole + fraction), depth range, fraction
- On DOM load and any input change: calls `/apps/woodslabs/price` via fetch()
- Response includes price + HMAC signature
- Updates the displayed price
- Stores signature as a hidden field
- On "Add to Cart": POSTs to Shopify Cart API with all config as line item properties + signature

No framework — vanilla JS only. Keeps it light and compatible with any theme.

**D. Cart Transform Shopify Function**

A Shopify Function (WebAssembly, written in JavaScript/AssemblyScript) that runs at checkout:
- Reads line item properties from the cart
- Verifies the HMAC signature against the price (using a shared secret)
- If valid: sets the actual line item price to the verified price
- If tampered: rejects/resets to $0 (or flags the order)

This is what enforces server-side pricing at checkout without draft orders. Cart Transform Functions are available on all Shopify plans (not Plus-only).

**E. Price Signing (Security)**

To prevent a customer from manipulating the price client-side:
1. App server computes: `signature = HMAC-SHA256(price + config_string, SECRET_KEY)`
2. Signature travels as a hidden cart line item property
3. Cart Transform Function recomputes the HMAC and compares — price cannot be spoofed

The SECRET_KEY lives only on the app server and inside the Function (as an environment variable). It is never in the browser.

**F. CSV Import Tool**

Simple password-protected HTML page at `/admin/import` on the app server:
- Basic HTTP auth (password set via environment variable)
- File upload form → server reads CSV → runs `TRUNCATE TABLE slab_pricing` → batch INSERT all rows
- Reports row count and any errors
- No developer involvement for routine price updates

---

## 3. Why This Approach

### Why not client-side pricing?
The brief explicitly requires server-side pricing. Client-side pricing would also expose the full 68,000-row pricing table to anyone who opens DevTools — unacceptable for a commercial product.

### Why not metafields/metaobjects for price storage?
- 3,168 records for one material type → 68,000+ for the full project
- Shopify metafield limits and API rate limits make this impractical
- MySQL is provided in the brief and is the right tool for a lookup table of this size

### Why not draft orders for pricing?
The brief explicitly forbids them. Draft orders break the native Shopify checkout flow — the customer gets redirected to a different URL, losing cart state and breaking discount codes, gift cards, etc.

### Why App Proxy instead of a public API?
App Proxy routes through `store.myshopify.com/apps/...` so fetch() calls stay same-origin from the browser's perspective. No CORS issues. Also means the pricing API isn't publicly enumerable — you need to know the store's domain.

### Why Railway?
- Managed MySQL included — no separate database service to configure
- Git-based deployment — push to main → live in seconds
- Free tier handles pilot traffic easily
- Scales when needed for the full project

### Why Shopify Functions for checkout enforcement?
Functions are the only native Shopify mechanism to modify line item prices at checkout without Plus. They run on Shopify's infrastructure, are fast (WebAssembly), and don't require a network call at checkout time — the signed price in the cart properties is all the Function needs.

### Why vanilla JS for the configurator?
- No build step, no bundler config
- Works in any Shopify theme without conflicts
- Easier for the client to review and hand off
- The form logic is sequential selection + one fetch call — no need for a framework

---

## 4. Implementation Order

1. **Setup** — Git, GitHub repo, Railway app, MySQL schema loaded, Shopify app registered
2. **Price API** — `/apps/woodslabs/price` endpoint with signing
3. **Configurator section** — Liquid + JS, all input rules, availability rules, price display
4. **Cart integration** — Add to Cart with properties + signature
5. **Cart Transform Function** — checkout price enforcement
6. **Availability rules** — thickness "Coming Soon" lockout, hardware depth rules
7. **Dimension rules** — fraction dropdowns, ceiling rules, rounding logic
8. **CSV import tool** — admin page, upload, replace
9. **Testing** — verify known price points from the CSV, test all edge cases
10. **Implementation note** — brief write-up for client

---

## 5. Key Data Facts

- **Pricing table**: `slab_pricing` (3,168 records for Material Type 10)
- **Lookup key**: material + finish + product_type + hardware + thickness + depth + width_inches
- **Placeholder rows**: thickness 0.5", 0.75", 1", 1.5" → price = $1,967, placeholder = 'yes' → shown as "Coming Soon"
- **Price range** (Material Type 10, unfinished): ~$74 to ~$303+ (real data); $1,967 = placeholder sentinel
- **Width range**: 9" to 96" (whole inches), plus 1/16th fractions
- **Depth ranges**: 3–6, 6.1–12, 12.1–16, 16.1–20, 20.1–24, 24.1–28
- **Thickness options**: 1.75", 2", 2.1–4" (range), 4.1–6" (range)

---

## 6. Project Info

| Field | Value |
|---|---|
| Brand | WoodSlabs |
| Prefix | wood- |
| Store | pilot-project-mwsx4wcj.myshopify.com |
| Theme (dev) | Mat10 Pilot Dev |
| GitHub | Arsalan Raza / woodslabs-shopify (public) |
| Compensation | $300 fixed (pilot) |
| Full project | 10 materials, 68,000+ price points |
