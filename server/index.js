require('dotenv').config();
const express = require('express');

const priceRouter  = require('./routes/price');
const importRouter = require('./routes/import');

const app  = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Price lookup — accessed via Shopify App Proxy at /apps/woodslabs/price
app.use('/apps/woodslabs/price', priceRouter);

// CSV import admin — password protected
app.use('/admin/import', importRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`WoodSlabs price server running on port ${PORT}`);
});
