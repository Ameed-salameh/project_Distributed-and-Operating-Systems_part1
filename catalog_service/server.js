const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_PATH = path.join(__dirname, 'catalog.json');

app.use(express.json());

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
