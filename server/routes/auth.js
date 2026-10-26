const express = require('express');
const crypto  = require('crypto');
const db      = require('../db');

const router = express.Router();

const API_KEY     = process.env.SHOPIFY_API_KEY    || '';
const API_SECRET  = process.env.SHOPIFY_API_SECRET || '';
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || '';
const SCOPES = 'read_products,write_products,write_cart_transforms';
const API_VERSION = '2025-07';
const CART_TRANSFORM_HANDLE = 'wood-cart-transform';

// Validate Shopify HMAC
function validateHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const message = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('&');
  const digest = crypto.createHmac('sha256', API_SECRET).update(message).digest('hex');
  if (digest.length !== hmac.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

// Shopify Admin GraphQL helper
async function shopifyGraphQL(shop, token, query, variables = {}) {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// Activate the Cart Transform Function for this shop
async function activateCartTransform(shop, token) {
  try {
    // Find the wood-cart-transform function ID
    const fnResult = await shopifyGraphQL(shop, token, `{
      shopifyFunctions(first: 50) {
        nodes { id apiType handle app { apiKey } }
      }
    }`);

    // Log all functions so we can see what's installed and which app they belong to
    const allFns = fnResult.data?.shopifyFunctions?.nodes || [];
    console.log(`[CartTransform] All functions (${allFns.length}):`, JSON.stringify(
      allFns.map(n => ({ id: n.id, handle: n.handle, apiKey: n.app?.apiKey }))
    ));
    console.log(`[CartTransform] Looking for handle=${CART_TRANSFORM_HANDLE} apiKey=${API_KEY}`);

    // Filter by both handle AND our app's API key so we don't pick up a
    // function with the same handle deployed by a different installed app.
    const fn = allFns.find(
      n => n.handle === CART_TRANSFORM_HANDLE && n.app?.apiKey === API_KEY
    );

    if (!fn) {
      console.log('[CartTransform] Function not found in our app — trying handle-only match as fallback');
      const fallback = allFns.find(n => n.handle === CART_TRANSFORM_HANDLE);
      if (fallback) {
        console.log(`[CartTransform] Fallback found: id=${fallback.id} apiKey=${fallback.app?.apiKey}`);
      } else {
        console.log('[CartTransform] No function with this handle — deploy the extension first.');
      }
      return;
    }

    // Ensure full GID — Shopify sometimes returns bare UUID from shopifyFunctions
    const functionGid = fn.id.startsWith('gid://')
      ? fn.id
      : `gid://shopify/ShopifyFunction/${fn.id}`;

    console.log(`[CartTransform] Found function GID: ${functionGid}`);

    // Create the cart transform (idempotent — Shopify returns error if already exists)
    const createResult = await shopifyGraphQL(shop, token,
      `mutation cartTransformCreate($functionId: String!) {
        cartTransformCreate(functionId: $functionId) {
          cartTransform { id }
          userErrors { field message }
        }
      }`,
      { functionId: functionGid }
    );

    // Log top-level GraphQL errors (auth/scope issues show here, not in userErrors)
    if (createResult.errors) {
      console.error(`[CartTransform] GraphQL errors: ${JSON.stringify(createResult.errors)}`);
    }

    const errors = createResult.data?.cartTransformCreate?.userErrors || [];
    if (errors.length > 0) {
      // "already exists" is fine — anything else is worth logging
      const msg = errors.map(e => e.message).join(', ');
      console.log(`[CartTransform] Activation response: ${msg}`);
    } else {
      const ctId = createResult.data?.cartTransformCreate?.cartTransform?.id;
      console.log(`[CartTransform] Activated: ${ctId || '(no ID returned — may already be active)'}`);
    }
  } catch (err) {
    console.error('[CartTransform] Activation error:', err.message);
  }
}

// GET / — either the Shopify Admin opens the app, or the merchant visits the install URL
router.get('/', async (req, res) => {
  const { shop, hmac } = req.query;

  // No shop param — serve a plain status page (Railway health / direct browser visit)
  if (!shop) {
    return res.send(`<!DOCTYPE html><html><head><title>WoodSlabs API</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:80px auto;padding:0 20px">
<h1>WoodSlabs Configurator</h1>
<p>Server is running. This app provides price lookup and cart transform services for the WoodSlabs Shopify store.</p>
<p><a href="/admin/import">CSV Import Admin</a></p>
</body></html>`);
  }

  // Shopify Admin opens the app with HMAC — validate it
  if (hmac && !validateHmac(req.query)) {
    return res.status(403).send('Invalid HMAC signature.');
  }

  // Check if this shop is already installed (has a token stored)
  try {
    const [rows] = await db.execute('SELECT token FROM shop_tokens WHERE shop = ?', [shop]);
    if (rows.length > 0) {
      // Already installed — show a simple status page
      return res.send(`<!DOCTYPE html><html><head><title>WoodSlabs Configurator</title>
<meta http-equiv="Content-Security-Policy" content="frame-ancestors https://${shop} https://admin.shopify.com">
</head>
<body style="font-family:sans-serif;max-width:640px;margin:80px auto;padding:0 20px">
<h1>WoodSlabs Configurator</h1>
<p style="color:green">&#10003; App is installed and active on <strong>${shop}</strong></p>
<ul>
<li>App Proxy: <code>/apps/woodslabs/price</code> → price lookup</li>
<li>Cart Transform: enforcing signed prices at checkout</li>
</ul>
<p><a href="https://${shop}/admin/themes" style="margin-right:16px">Theme Editor</a>
<a href="/admin/import">CSV Import</a></p>
</body></html>`);
    }
  } catch (_) { /* DB not ready yet — fall through to OAuth */ }

  // Not installed (or DB unavailable) — start OAuth flow
  // Use JS top-frame redirect instead of res.redirect() so it works when
  // Shopify Admin loads the app in an iframe (OAuth page blocks iframe loads).
  const nonce = crypto.randomBytes(16).toString('hex');
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${nonce}`;
  return res.send(`<!DOCTYPE html><html><head>
<script>window.top.location.href = ${JSON.stringify(authUrl)};</script>
</head><body>Redirecting to install&hellip;</body></html>`);
});

// GET /auth/callback — Shopify redirects here after merchant authorizes
router.get('/auth/callback', async (req, res) => {
  const { shop, code, hmac } = req.query;

  if (!shop || !code) return res.status(400).send('Missing parameters.');

  if (!validateHmac(req.query)) {
    return res.status(403).send('Invalid HMAC.');
  }

  try {
    // Exchange code for access token
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: API_KEY, client_secret: API_SECRET, code }),
    });

    const data = await response.json();

    if (!data.access_token) {
      return res.status(400).send('Token exchange failed: ' + JSON.stringify(data));
    }

    const token = data.access_token;

    // Persist token for future API calls (Cart Transform activation, etc.)
    await db.execute(
      'INSERT INTO shop_tokens (shop, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = ?',
      [shop, token, token]
    );
    console.log(`App installed on ${shop}`);

    // Activate the Cart Transform Function
    await activateCartTransform(shop, token);

    return res.redirect(`https://${shop}/admin`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send('OAuth error: ' + err.message);
  }
});

// GET /admin/reactivate?shop=... — re-run Cart Transform activation using stored token
router.get('/admin/reactivate', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop param.');
  try {
    const [rows] = await db.execute('SELECT token FROM shop_tokens WHERE shop = ?', [shop]);
    if (!rows.length) return res.status(404).send('Shop not installed.');
    await activateCartTransform(shop, rows[0].token);
    res.send('Cart Transform activation attempted — check Railway logs for result.');
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

module.exports = router;
