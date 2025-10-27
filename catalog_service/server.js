const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_PATH = path.join(__dirname, 'catalog.json');

app.use(express.json());

// Simple in-process mutex to serialize updates
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

// GET /search/:topic -> returns array of { id, title }
app.get('/search/:topic', (req, res) => {
  try {
    const topic = decodeURIComponent(req.params.topic || '').toLowerCase();
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const books = JSON.parse(raw);
    const items = books
      .filter(b => (b.topic || '').toLowerCase() === topic)
      .map(b => ({ id: b.id, title: b.title }));
    return res.json(items);
  } catch (err) {
    console.error('search error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// POST /update -> body: { id: number, price?: number, quantityDelta?: number }
app.post('/update', async (req, res) => {
  await acquireLock();
  try {
    const { id, price, quantityDelta } = req.body || {};
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const books = JSON.parse(raw);
    const idx = books.findIndex(b => b.id === parsedId);
    if (idx === -1) {
      return res.status(404).json({ error: 'not_found' });
    }
    // update price if provided
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ error: 'invalid_price' });
      }
      books[idx].price = p;
    }
    // apply quantity delta if provided
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
    fs.writeFileSync(DATA_PATH, JSON.stringify(books, null, 2), 'utf8');
    const { title, quantity, price: newPrice } = books[idx];
    return res.json({ id: parsedId, title, quantity, price: newPrice });
  } catch (err) {
    console.error('update error:', err.message);
    return res.status(500).json({ error: 'internal_error' });
  } finally {
    releaseLock();
  }
});

// GET /info/:id -> returns { title, quantity, price }
app.get('/info/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const books = JSON.parse(raw);
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
