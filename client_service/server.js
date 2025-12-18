const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');

app.use(express.json());

// ============ LAB 2: In-Memory Cache ============
const cache = new Map(); // { key: { data, timestamp } }
const CACHE_TTL = 60000; // 60 seconds

// Cache Statistics for Performance Evaluation
const cacheStats = {
  hits: 0,
  misses: 0,
  invalidations: 0
};

// ============ LAB 2: Round-Robin Load Balancer ============
let catalogRoundRobin = 0;
let orderRoundRobin = 0;

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw || 'null');
}

// ============ LAB 2: Get Catalog Replicas URLs ============
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

// ============ LAB 2: Get Order Replicas URLs ============
function getOrderReplicas() {
  const envOrder = process.env.ORDER_URLS;
  if (envOrder) {
    return envOrder.split(',').map(url => new URL(url.trim()));
  }
  const config = fs.existsSync(CONFIG_PATH) ? (readJSON(CONFIG_PATH) || {}) : {};
  if (config.ORDER_URLS && Array.isArray(config.ORDER_URLS)) {
    return config.ORDER_URLS.map(url => new URL(url));
  }
  // Fallback to single order
  const orderUrl = process.env.ORDER_URL || config.ORDER_URL || 'http://localhost:3002';
  return [new URL(orderUrl)];
}

// ============ LAB 2: Round-Robin Load Balancer ============
function getNextCatalog() {
  const replicas = getCatalogReplicas();
  const selected = replicas[catalogRoundRobin % replicas.length];
  catalogRoundRobin++;
  return selected;
}

function getNextOrder() {
  const replicas = getOrderReplicas();
  const selected = replicas[orderRoundRobin % replicas.length];
  orderRoundRobin++;
  return selected;
}

// ============ LAB 2: Cache Operations ============
function getCacheKey(type, param) {
  return `${type}:${param}`;
}

function getCache(key) {
  const cached = cache.get(key);
  if (!cached) {
    cacheStats.misses++;
    return null;
  }
  
  // Check TTL
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    cacheStats.misses++;
    return null;
  }
  
  cacheStats.hits++;
  return cached.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(key) {
  const deleted = cache.delete(key);
  if (deleted) {
    cacheStats.invalidations++;
  }
  return deleted;
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

// ============ LAB 2: Cache Invalidation Endpoint ============
app.post('/invalidate', (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) {
      return res.status(400).json({ error: 'key_required' });
    }
    const deleted = invalidateCache(key);
    console.log(`Cache invalidation: ${key} - ${deleted ? 'deleted' : 'not found'}`);
    return res.json({ status: 'ok', deleted });
  } catch (err) {
    console.error('invalidation error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ============ LAB 2: Cache Statistics Endpoint ============
app.get('/cache/stats', (req, res) => {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) : 0;
  return res.json({
    ...cacheStats,
    total,
    hitRate: `${hitRate}%`,
    cacheSize: cache.size
  });
});

// GET /search
app.get('/search/:topic', async (req, res) => {
  try {
    const topic = req.params.topic || '';
    const cacheKey = getCacheKey('search', topic);
    
    // LAB 2: Check cache first
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`Cache HIT: search/${topic}`);
      return res.json({ items: cached, fromCache: true });
    }
    
    console.log(`Cache MISS: search/${topic}`);
    
    // LAB 2: Use Round-Robin to select Catalog Replica
    const catalogUrl = getNextCatalog();
    const topicEncoded = encodeURIComponent(topic);
    const resp = await httpRequest({
      hostname: catalogUrl.hostname,
      port: catalogUrl.port || 80,
      path: `/search/${topicEncoded}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (resp.statusCode !== 200) {
      return res.status(resp.statusCode || 502).json({ error: 'catalog_search_failed', detail: resp.body });
    }
    
    // LAB 2: Store in cache
    setCache(cacheKey, resp.body);
    
    console.log('Search results:', resp.body);
    return res.json({ items: resp.body, fromCache: false });
  } catch (err) {
    console.error('client search error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// GET /info/
app.get('/info/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
    
    const cacheKey = getCacheKey('info', id);
    
    // LAB 2: Check cache first
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`Cache HIT: info/${id}`);
      return res.json({ ...cached, fromCache: true });
    }
    
    console.log(`Cache MISS: info/${id}`);
    
    // LAB 2: Use Round-Robin to select Catalog Replica
    const catalogUrl = getNextCatalog();
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
    
    // LAB 2: Store in cache
    setCache(cacheKey, resp.body);
    
    console.log('Info:', resp.body);
    return res.json({ ...resp.body, fromCache: false });
  } catch (err) {
    console.error('client info error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// POST /purchase
app.post('/purchase/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid_id' });
    
    // LAB 2: Purchase does NOT use cache - goes directly to Order Service
    // LAB 2: Use Round-Robin to select Order Replica
    const orderUrl = getNextOrder();
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
