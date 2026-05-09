require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Init DB
initDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/lots', require('./routes/lots'));
app.use('/api/demands', require('./routes/demands'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', project: 'TraceChain' }));

app.listen(PORT, () => console.log(`TraceChain backend running on port ${PORT}`));
