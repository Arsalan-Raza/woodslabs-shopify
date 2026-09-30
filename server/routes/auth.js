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
        nodes { id apiType handle }
      }
    }`);

    const fn = fnResult.data?.shopifyFunctions?.nodes?.find(
      n => n.handle === CART_TRANSFORM_HANDLE
    );

    if (!fn) {
      console.log('[CartTransform] Function not found — deploy the extension first.');
      return;
    }

    console.log(`[CartTransform] Found function: ${fn.id}`);

    // Create the cart transform (idempotent — Shopify returns error if already exists)
    const createResult = await shopifyGraphQL(shop, token,
      `mutation cartTransformCreate($functionId: ID!) {
        cartTransformCreate(functionId: $functionId) {
          cartTransform { id }
          userErrors { field message }
        }
      }`,
      { functionId: fn.id }
    );

    const errors = createResult.data?.cartTransformCreate?.userErrors || [];
    if (errors.length > 0) {
      // "already exists" is fine — anything else is worth logging
      const msg = errors.map(e => e.message).join(', ');
      console.log(`[CartTransform] Activation response: ${msg}`);
    } else {
      const ctId = createResult.data?.cartTransformCreate?.cartTransform?.id;
      console.log(`[CartTransform] Activated: ${ctId}`);
    }
  } catch (err) {
    console.error('[CartTransform] Activation error:', err.message);
  }
}

// GET / — Shopify redirects here to begin install
router.get('/', (req, res) => {
  const { shop, hmac } = req.query;

  if (!shop) return res.status(400).send('Missing shop parameter.');

  if (hmac && !validateHmac(req.query)) {
    return res.status(403).send('Invalid HMAC.');
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${nonce}`;
  res.redirect(authUrl);
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

module.exports = router;
