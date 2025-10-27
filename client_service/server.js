const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');

app.use(express.json());

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw || 'null');
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
    if (body) req.write(body);
    req.end();
  });
}

app.get('/', (req, res) => {
  res.send('client_service is running');
});

// GET /search/:topic -> proxy to catalog_service
app.get('/search/:topic', async (req, res) => {
  try {
    const config = readJSON(CONFIG_PATH) || {};
    const catalogUrl = new URL(config.CATALOG_URL || 'http://localhost:3001');
    const topic = encodeURIComponent(req.params.topic || '');
    const resp = await httpRequest({
      hostname: catalogUrl.hostname,
      port: catalogUrl.port || 80,
      path: `/search/${topic}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (resp.statusCode !== 200) {
      return res.status(resp.statusCode || 502).json({ error: 'catalog_search_failed', detail: resp.body });
    }
    console.log('Search results:', resp.body);
    return res.json({ items: resp.body });
  } catch (err) {
    console.error('client search error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// GET /info/:id -> proxy to catalog_service
app.get('/info/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
    const config = readJSON(CONFIG_PATH) || {};
    const catalogUrl = new URL(config.CATALOG_URL || 'http://localhost:3001');
    const resp = await httpRequest({
      hostname: catalogUrl.hostname,
      port: catalogUrl.port || 80,
      path: `/info/${id}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (resp.statusCode !== 200) {
      return res.status(resp.statusCode || 502).json({ error: 'catalog_info_failed', detail: resp.body });
    }
    console.log('Info:', resp.body);
    return res.json(resp.body);
  } catch (err) {
    console.error('client info error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// POST /purchase/:id -> proxy to order_service
app.post('/purchase/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
    const config = readJSON(CONFIG_PATH) || {};
    const orderUrl = new URL(config.ORDER_URL || 'http://localhost:3002');
    const resp = await httpRequest({
      hostname: orderUrl.hostname,
      port: orderUrl.port || 80,
      path: `/purchase/${id}`,
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    if (resp.statusCode !== 200) {
      return res.status(resp.statusCode || 502).json({ error: 'order_purchase_failed', detail: resp.body });
    }
    console.log('Purchase response:', resp.body);
    return res.json(resp.body);
  } catch (err) {
    console.error('client purchase error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.listen(PORT, () => {
  console.log(`client_service listening on port ${PORT}`);
});
