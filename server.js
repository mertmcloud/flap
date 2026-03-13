const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
// Render'da disk mount path: DATA_DIR=/data env variable ile ayarlanır
const DATA_DIR = process.env.DATA_DIR || __dirname;
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const MAX_SCORES = 100;

app.use(express.json());
app.use(express.static(__dirname));

function readScores() {
  try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); }
  catch { return []; }
}

function writeScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

app.get('/api/scores', (req, res) => {
  res.json(readScores());
});

app.post('/api/scores', (req, res) => {
  const { name, score, char } = req.body;
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Geçersiz skor' });
  }
  const scores = readScores();
  scores.push({ name: (name || 'Anonim').slice(0, 32), score: Math.floor(score), char: char || '?', date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > MAX_SCORES) scores.length = MAX_SCORES;
  writeScores(scores);
  res.json(scores);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flappy Ekip sunucusu çalışıyor: http://localhost:${PORT}`));
