require('dotenv').config();
const express = require('express');
const db      = require('./db');

const priceRouter  = require('./routes/price');
const importRouter = require('./routes/import');
const authRouter   = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// Auto-create slab_pricing table on startup (retries for proxy warm-up)
async function migrate(attempts = 10, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS slab_pricing (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          material      VARCHAR(20)    NOT NULL,
          finish        VARCHAR(12)    NOT NULL,
          product_type  VARCHAR(8)     NOT NULL,
          hardware      VARCHAR(3)     NOT NULL,
          thickness     VARCHAR(8)     NOT NULL,
          depth         VARCHAR(10)    NOT NULL,
          width_inches  TINYINT        NOT NULL,
          price         DECIMAL(10,2)  NOT NULL,
          placeholder   CHAR(3)        NOT NULL DEFAULT 'no',
          INDEX idx_lookup (material, finish, product_type, hardware, thickness, depth, width_inches)
        )
      `);
      console.log('Database ready (slab_pricing table exists).');
      return;
    } catch (err) {
      console.error(`Migration attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  console.error('Could not connect to database after all retries. Continuing anyway.');
}

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Shopify OAuth install flow
app.use('/auth/callback', authRouter);
app.use('/', authRouter);

// Price lookup — accessed via Shopify App Proxy at /apps/woodslabs/price
app.use('/apps/woodslabs/price', priceRouter);

// CSV import admin — password protected
app.use('/admin/import', importRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

migrate().then(() => {
  app.listen(PORT, () => {
    console.log(`WoodSlabs price server running on port ${PORT}`);
  });
});
