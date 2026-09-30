const express = require('express');
const crypto  = require('crypto');

const router = express.Router();

const API_KEY    = process.env.SHOPIFY_API_KEY    || '';
const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || '';
const SCOPES = 'read_products,write_products';

// Validate Shopify HMAC
function validateHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const message = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('&');
  const digest = crypto.createHmac('sha256', API_SECRET).update(message).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
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

    if (data.access_token) {
      // App installed. For this pilot we only need the App Proxy —
      // no token storage required. Redirect merchant to their admin.
      console.log(`App installed on ${shop}`);
      return res.redirect(`https://${shop}/admin`);
    }

    res.status(400).send('Token exchange failed: ' + JSON.stringify(data));
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send('OAuth error: ' + err.message);
  }
});

module.exports = router;
