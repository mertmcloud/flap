const express = require('express');
const { Pool } = require('pg');

const app = express();
const MAX_SCORES = 100;

app.use(express.json());

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

app.get('/api/health', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL tanımlı değil' });
  }
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, score, char, date FROM scores ORDER BY score DESC LIMIT $1',
      [MAX_SCORES]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('GET /api/scores hatası:', e.message);
    res.status(500).json([]);
  }
});

app.post('/api/scores', async (req, res) => {
  const { name, score, char } = req.body;
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Geçersiz skor' });
  }
  try {
    const cleanName = (name || 'Anonim').slice(0, 32);
    const existing = await pool.query('SELECT id, score FROM scores WHERE name=$1', [cleanName]);
    if (existing.rows.length > 0) {
      if (Math.floor(score) > existing.rows[0].score) {
        await pool.query('UPDATE scores SET score=$1, char=$2, date=$3 WHERE id=$4',
          [Math.floor(score), char || '?', Date.now(), existing.rows[0].id]);
      } else {
        return res.status(409).json({ error: 'Bu isimle daha yüksek bir skor zaten var' });
      }
    } else {
      await pool.query(
        'INSERT INTO scores (name, score, char, date) VALUES ($1, $2, $3, $4)',
        [cleanName, Math.floor(score), char || '?', Date.now()]
      );
    }
    const result = await pool.query(
      'SELECT name, score, char, date FROM scores ORDER BY score DESC LIMIT $1',
      [MAX_SCORES]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('POST /api/scores hatası:', e.message);
    res.status(500).json({ error: 'Skor kaydedilemedi' });
  }
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flappy Ekip sunucusu çalışıyor: http://localhost:${PORT}`));

initDB()
  .then(() => console.log('Veritabanı hazır'))
  .catch(err => console.error('DB başlatılamadı:', err.message));
