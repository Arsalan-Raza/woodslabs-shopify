const express = require('express');
const multer  = require('multer');
const { parse } = require('csv-parse');
const db      = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Basic auth middleware — checks IMPORT_ADMIN_PASSWORD env var
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="WoodSlabs Import"');
    return res.status(401).send('Authentication required');
  }
  const [, encoded] = auth.split(' ');
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const [, password] = decoded.split(':');
  if (password !== process.env.IMPORT_ADMIN_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="WoodSlabs Import"');
    return res.status(401).send('Wrong password');
  }
  next();
}

// GET /admin/import — upload form
router.get('/', requireAuth, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WoodSlabs — Price Import</title>
  <style>
    body { font-family: sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; }
    h1 { font-size: 1.4rem; }
    .info { background: #f5f5f5; border-left: 4px solid #333; padding: 12px 16px; margin: 20px 0; font-size: 0.9rem; }
    label { display: block; margin: 20px 0 6px; font-weight: bold; }
    input[type=file] { display: block; margin-bottom: 20px; }
    button { background: #222; color: #fff; border: none; padding: 12px 28px; font-size: 1rem; cursor: pointer; border-radius: 4px; }
    button:hover { background: #444; }
  </style>
</head>
<body>
  <h1>WoodSlabs — Pricing CSV Import</h1>
  <div class="info">
    <strong>This replaces all pricing data.</strong><br>
    Upload a CSV with columns:<br>
    <code>material, finish, product_type, hardware, thickness, depth, width_inches, price, placeholder</code><br><br>
    The existing table will be cleared and replaced in one operation.
  </div>
  <form method="POST" enctype="multipart/form-data" action="/admin/import">
    <label for="csv">Select pricing CSV file:</label>
    <input type="file" id="csv" name="csv" accept=".csv" required>
    <button type="submit">Upload &amp; Replace Pricing Data</button>
  </form>
</body>
</html>`);
});

// POST /admin/import — process CSV
router.post('/', requireAuth, upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const csvText = req.file.buffer.toString('utf8');
  const rows = [];

  try {
    await new Promise((resolve, reject) => {
      parse(csvText, { columns: true, skip_empty_lines: true, trim: true }, (err, records) => {
        if (err) return reject(err);
        for (const r of records) {
          const widthInt = parseInt(r.width_inches, 10);
          const price    = parseFloat(r.price);
          if (isNaN(widthInt) || isNaN(price)) continue; // skip bad rows
          rows.push([
            r.material.toLowerCase(),
            r.finish.toLowerCase(),
            r.product_type.toLowerCase(),
            r.hardware.toLowerCase(),
            r.thickness,
            r.depth,
            widthInt,
            price,
            r.placeholder === 'yes' ? 'yes' : 'no',
          ]);
        }
        resolve();
      });
    });
  } catch (err) {
    return res.status(400).send(`CSV parse error: ${err.message}`);
  }

  if (rows.length === 0) {
    return res.status(400).send('No valid rows found in CSV. Import aborted — existing data unchanged.');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('TRUNCATE TABLE slab_pricing');

    // Batch insert in chunks of 500
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
      await conn.execute(
        `INSERT INTO slab_pricing (material,finish,product_type,hardware,thickness,depth,width_inches,price,placeholder) VALUES ${placeholders}`,
        chunk.flat()
      );
    }

    await conn.commit();
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Import Complete</title>
<style>body{font-family:sans-serif;max-width:640px;margin:60px auto;padding:0 20px}
.ok{background:#e6f4ea;border-left:4px solid #2e7d32;padding:12px 16px;margin:20px 0}
a{color:#222}</style></head>
<body>
  <h1>Import Complete</h1>
  <div class="ok"><strong>${rows.length} rows</strong> imported successfully. Existing data replaced.</div>
  <a href="/admin/import">Import another file</a>
</body></html>`);
  } catch (err) {
    await conn.rollback();
    console.error('Import DB error:', err);
    res.status(500).send(`Database error during import: ${err.message}<br>Existing data was NOT changed (transaction rolled back).`);
  } finally {
    conn.release();
  }
});

module.exports = router;
