const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

app.get('/', (req, res) => {
  res.send('order_service is running');
});

app.listen(PORT, () => {
  console.log(`order_service listening on port ${PORT}`);
});


