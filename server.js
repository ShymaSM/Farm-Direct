const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files (Firebase Serverless App)
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve the frontend index file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server started on port ${PORT}. Open http://localhost:${PORT}/login.html in your browser.`));
}

module.exports = app;
