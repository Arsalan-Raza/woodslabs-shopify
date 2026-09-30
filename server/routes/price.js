const express = require('express');
const crypto  = require('crypto');
const db      = require('../db');

const router = express.Router();

// GET /apps/woodslabs/price
// Query params: material, finish, product_type, hardware, thickness, depth, width_inches
// Returns: { price, signature } or { error }
router.get('/', async (req, res) => {
  const { material, finish, product_type, hardware, thickness, depth, width_inches } = req.query;

  // Validate all required params are present
  const required = { material, finish, product_type, hardware, thickness, depth, width_inches };
  for (const [key, val] of Object.entries(required)) {
    if (!val || val.trim() === '') {
      return res.status(400).json({ error: `Missing parameter: ${key}` });
    }
  }

  const widthInt = parseInt(width_inches, 10);
  if (isNaN(widthInt) || widthInt < 9 || widthInt > 96) {
    return res.status(400).json({ error: 'width_inches must be an integer between 9 and 96' });
  }

  // Shopify's App Proxy strips the inch-mark (") from URL params.
  // Normalize: always ensure thickness ends with " to match DB values.
  const normalizedThickness = thickness.trim().endsWith('"')
    ? thickness.trim()
    : thickness.trim() + '"';

  try {
    const [rows] = await db.execute(
      `SELECT price, placeholder FROM slab_pricing
       WHERE material = ? AND finish = ? AND product_type = ?
         AND hardware = ? AND thickness = ? AND depth = ?
         AND width_inches = ?
       LIMIT 1`,
      [
        material.trim().toLowerCase(),
        finish.trim().toLowerCase(),
        product_type.trim().toLowerCase(),
        hardware.trim().toLowerCase(),
        normalizedThickness,
        depth.trim(),
        widthInt,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No price found for this combination' });
    }

    const row = rows[0];
    const price = parseFloat(row.price);
    const isPlaceholder = row.placeholder === 'yes';

    // Build the message string to sign — same format the Cart Transform Function uses to verify
    const message = [
      material.trim().toLowerCase(),
      finish.trim().toLowerCase(),
      product_type.trim().toLowerCase(),
      hardware.trim().toLowerCase(),
      normalizedThickness,
      depth.trim(),
      widthInt,
      price.toFixed(2),
    ].join('|');

    const signature = crypto
      .createHmac('sha256', process.env.PRICE_SIGNING_SECRET || 'dev_secret')
      .update(message)
      .digest('hex');

    res.json({
      price,
      signature,
      is_placeholder: isPlaceholder,
      // is_placeholder signals the UI to show "Coming Soon" instead of the price
    });
  } catch (err) {
    console.error('Price lookup error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
