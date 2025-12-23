const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'catalog.csv');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Copy initial catalog.csv to data directory if not exists
const INITIAL_DATA = path.join(__dirname, 'catalog.csv');
if (!fs.existsSync(DATA_PATH) && fs.existsSync(INITIAL_DATA)) {
  fs.copyFileSync(INITIAL_DATA, DATA_PATH);
}

app.use(express.json());

// ============ LAB 2: Client Service URL for Cache Invalidation ============
function getClientServiceURL() {
  const envClient = process.env.CLIENT_URL;
  if (envClient) return new URL(envClient);
  return new URL('http://localhost:3000');
}

// ============ LAB 2: Send Cache Invalidation to Front-End ============
function sendCacheInvalidation(key) {
  const clientUrl = getClientServiceURL();
  const body = JSON.stringify({ key });
  
  const options = {
    hostname: clientUrl.hostname,
    port: clientUrl.port || 80,
    path: '/invalidate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`Cache invalidation sent for key: ${key}, status: ${res.statusCode}`);
  });
  
  req.on('error', (err) => {
    console.error(`Cache invalidation failed for key: ${key}`, err.message);
  });
  
  req.write(body);
  req.end();
}


const updateLock = {
  locked: false,
  queue: [],
};
function acquireLock() {
  return new Promise(resolve => {
    if (!updateLock.locked) {
      updateLock.locked = true;
      return resolve();
    }
    updateLock.queue.push(resolve);
  });
}
function releaseLock() {
  const next = updateLock.queue.shift();
  if (next) {
    next();
  } else {
    updateLock.locked = false;
  }
}

app.get('/', (req, res) => {
  res.send('catalog_service is running');
});

function parseCSV(text) {
  const lines = (text || '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i];
    });
    obj.id = parseInt(obj.id, 10);
    obj.quantity = parseInt(obj.quantity, 10);
    obj.price = Number(obj.price);
    return obj;
  });
}

function toCSV(rows) {
  const headers = ['id','title','topic','quantity','price'];
  const hdr = headers.join(',');
  const body = (rows || []).map(r => headers.map(h => `${r[h]}`).join(',')).join('\n');
  return [hdr, body].filter(Boolean).join('\n');
}

function readCatalog() {
  if (!fs.existsSync(DATA_PATH)) return [];
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return parseCSV(raw);
}

function writeCatalog(rows) {
  fs.writeFileSync(DATA_PATH, toCSV(rows), 'utf8');
}

// GET /search
app.get('/search/:topic', (req, res) => {
  try {
    const topic = decodeURIComponent(req.params.topic || '').toLowerCase();
    console.log(`[${new Date().toISOString()}] GET /search/${topic}`);
    const books = readCatalog();
    const items = books
      .filter(b => (b.topic || '').toLowerCase() === topic)
      .map(b => ({ id: b.id, title: b.title }));
    return res.json(items);
  } catch (err) {
    console.error('search error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// POST /update
app.post('/update', async (req, res) => {
  await acquireLock();
  try {
    const { id, price, quantityDelta } = req.body || {};
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    const books = readCatalog();
    const idx = books.findIndex(b => b.id === parsedId);
    if (idx === -1) {
      return res.status(404).json({ error: 'not_found' });
    }
    // update price i
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ error: 'invalid_price' });
      }
      books[idx].price = p;
    }
    
    if (quantityDelta !== undefined) {
      const qd = parseInt(quantityDelta, 10);
      if (!Number.isFinite(qd)) {
        return res.status(400).json({ error: 'invalid_quantityDelta' });
      }
      const newQty = (parseInt(books[idx].quantity, 10) || 0) + qd;
      if (newQty < 0) {
        return res.status(400).json({ error: 'quantity_cannot_be_negative' });
      }
      books[idx].quantity = newQty;
    }
    writeCatalog(books);
    
    // ============ LAB 2: Invalidate Cache for this book ============
    sendCacheInvalidation(`info:${parsedId}`);
    
    // ============ LAB 2: Invalidate search cache for this book's topic ============
    const bookTopic = books[idx].topic;
    if (bookTopic) {
      sendCacheInvalidation(`search:${bookTopic}`);
    }
    
    const { title, quantity, price: newPrice } = books[idx];
    return res.json({ id: parsedId, title, quantity, price: newPrice });
  } catch (err) {
    console.error('update error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  } finally {
    releaseLock();
  }
});

// GET /info
app.get('/info/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    console.log(`[${new Date().toISOString()}] GET /info/${id}`);
    const books = readCatalog();
    const found = books.find(b => b.id === id);
    if (!found) {
      return res.status(404).json({ error: 'not_found' });
    }
    const { title, quantity, price } = found;
    return res.json({ title, quantity, price });
  } catch (err) {
    console.error('info error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.listen(PORT, () => {
  console.log(`catalog_service listening on port ${PORT}`);
});