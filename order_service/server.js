const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3002;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const ORDERS_PATH = path.join(__dirname, 'orders.json');

app.use(express.json());

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw || 'null');
}

function writeJSON(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

app.get('/', (req, res) => {
  res.send('order_service is running');
});

// POST /purchase/:id
app.post('/purchase/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const config = readJSON(CONFIG_PATH) || {};
    const catalogUrl = new URL(config.CATALOG_URL || 'http://localhost:3001');

    // 1) Get info
    const infoResp = await httpRequest({
      hostname: catalogUrl.hostname,
      port: catalogUrl.port || 80,
      path: `/info/${id}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (infoResp.statusCode !== 200) {
      return res.status(infoResp.statusCode || 502).json({ error: 'catalog_info_failed', detail: infoResp.body });
    }
    const { title, quantity, price } = infoResp.body || {};
    if (!title) {
      return res.status(404).json({ error: 'not_found' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(409).json({ error: 'out_of_stock' });
    }

    // 2) Decrement stock
    const updateBody = JSON.stringify({ id, quantityDelta: -1 });
    const updateResp = await httpRequest({
      hostname: catalogUrl.hostname,
      port: catalogUrl.port || 80,
      path: `/update`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateBody)
      }
    }, updateBody);
    if (updateResp.statusCode !== 200) {
      return res.status(updateResp.statusCode || 502).json({ error: 'catalog_update_failed', detail: updateResp.body });
    }

    // 3) Record order
    const existing = readJSON(ORDERS_PATH) || [];
    const order = {
      id,
      title,
      price,
      ts: new Date().toISOString()
    };
    existing.push(order);
    writeJSON(ORDERS_PATH, existing);

    console.log(`bought book ${title}`);
    return res.json({ status: 'ok', order });
  } catch (err) {
    console.error('purchase error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.listen(PORT, () => {
  console.log(`order_service listening on port ${PORT}`);
});
