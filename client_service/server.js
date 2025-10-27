const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('client_service is running');
});

app.listen(PORT, () => {
  console.log(`client_service listening on port ${PORT}`);
});
