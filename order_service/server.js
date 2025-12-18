const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3002;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const ORDERS_PATH = path.join(__dirname, 'orders.csv');

app.use(express.json());

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw || 'null');
}

// ============ LAB 2: Get All Catalog Replicas ============
function getCatalogReplicas() {
  const envCatalog = process.env.CATALOG_URLS;
  if (envCatalog) {
    return envCatalog.split(',').map(url => new URL(url.trim()));
  }
  const config = fs.existsSync(CONFIG_PATH) ? (readJSON(CONFIG_PATH) || {}) : {};
  if (config.CATALOG_URLS && Array.isArray(config.CATALOG_URLS)) {
    return config.CATALOG_URLS.map(url => new URL(url));
  }
  // Fallback to single catalog
  const catalogUrl = process.env.CATALOG_URL || config.CATALOG_URL || 'http://localhost:3001';
  return [new URL(catalogUrl)];
}

// ============ LAB 2: Get Client Service URL ============
function getClientServiceURL() {
  const envClient = process.env.CLIENT_URL;
  if (envClient) return new URL(envClient);
  const config = fs.existsSync(CONFIG_PATH) ? (readJSON(CONFIG_PATH) || {}) : {};
  if (config.CLIENT_URL) return new URL(config.CLIENT_URL);
  return new URL('http://localhost:3000');
}

function ensureOrdersHeader() {
  if (!fs.existsSync(ORDERS_PATH) || fs.readFileSync(ORDERS_PATH, 'utf8').trim() === '') {
    fs.writeFileSync(ORDERS_PATH, 'id,title,price,ts\n', 'utf8');
  }
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function appendOrderCSV(order) {
  ensureOrdersHeader();
  const row = [order.id, csvEscape(order.title), order.price, order.ts].join(',') + '\n';
  fs.appendFileSync(ORDERS_PATH, row, 'utf8');
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

    // ============ LAB 2: Get first catalog replica for info ============
    const catalogReplicas = getCatalogReplicas();
    const firstCatalog = catalogReplicas[0];

    //  Get 
    const infoResp = await httpRequest({
      hostname: firstCatalog.hostname,
      port: firstCatalog.port || 80,
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

    // ============ LAB 2: Update ONE Catalog Replica ============
    // Note: Since replicas share the same volume, updating one replica
    // automatically updates the shared catalog.csv file that all replicas read from
    const updateBody = JSON.stringify({ id, quantityDelta: -1 });
    const updateResp = await httpRequest({
      hostname: firstCatalog.hostname,
      port: firstCatalog.port || 80,
      path: `/update`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateBody)
      }
    }, updateBody);
    
    if (updateResp.statusCode !== 200) {
      return res.status(updateResp.statusCode || 502).json({ 
        error: 'catalog_update_failed', 
        detail: updateResp.body 
      });
    }
    
    console.log(`Updated catalog via replica at ${firstCatalog.hostname}:${firstCatalog.port}`);

    // ============ LAB 2: Send Cache Invalidation to Client ============
    const clientUrl = getClientServiceURL();
    const invalidateBody = JSON.stringify({ key: `info:${id}` });
    httpRequest({
      hostname: clientUrl.hostname,
      port: clientUrl.port || 80,
      path: '/invalidate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(invalidateBody)
      }
    }, invalidateBody).catch(err => {
      console.error('Cache invalidation failed:', err.message);
    });

    const order = {
      id,
      title,
      price,
      ts: new Date().toISOString()
    };
    appendOrderCSV(order);

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