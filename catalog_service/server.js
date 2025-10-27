const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('catalog_service is running');
});

app.listen(PORT, () => {
  console.log(`catalog_service listening on port ${PORT}`);
});
