const express = require('express');
const { Pool } = require('pg');

const app = express();
const MAX_SCORES = 100;

app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(32) NOT NULL,
      score INTEGER NOT NULL,
      char VARCHAR(64) NOT NULL,
      date BIGINT NOT NULL
    )
  `);
}

app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, score, char, date FROM scores ORDER BY score DESC LIMIT $1',
      [MAX_SCORES]
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

app.post('/api/scores', async (req, res) => {
  const { name, score, char } = req.body;
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Geçersiz skor' });
  }
  try {
    await pool.query(
      'INSERT INTO scores (name, score, char, date) VALUES ($1, $2, $3, $4)',
      [(name || 'Anonim').slice(0, 32), Math.floor(score), char || '?', Date.now()]
    );
    const result = await pool.query(
      'SELECT name, score, char, date FROM scores ORDER BY score DESC LIMIT $1',
      [MAX_SCORES]
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Skor kaydedilemedi' });
  }
});

const PORT = process.env.PORT || 3000;
initDB()
  .then(() => app.listen(PORT, () => console.log(`Flappy Ekip sunucusu çalışıyor: http://localhost:${PORT}`)))
  .catch(err => { console.error('DB başlatılamadı:', err); process.exit(1); });
