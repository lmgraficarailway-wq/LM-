const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the arte-generator folder
app.use(express.static(path.join(__dirname, 'arte-generator')));

// Fallback: serve index.html for any route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'arte-generator', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LM PASSO rodando na porta ${PORT}`);
});
