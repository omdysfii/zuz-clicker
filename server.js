const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Database = require('better-sqlite3');
const db = new Database('zuz.db');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    energy INTEGER DEFAULT 1500,
    lastUpdate INTEGER
  )
`).run();


app.get('/api/user/:id', (req, res) => {
  const ref = req.query.ref;
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  const now = Math.floor(Date.now() / 1000);

  if (!user) {
    db.prepare('INSERT INTO users (id, lastUpdate, inviter) VALUES (?, ?, ?)')
      .run(req.params.id, now, ref || null);
    if (ref) {
      db.prepare('UPDATE users SET balance = balance + 300 WHERE id = ?').run(ref);
    }
    user = { id: req.params.id, balance: 0, energy: 1500, lastUpdate: now };
  } else {
    const seconds = now - user.lastUpdate;
    const regen = Math.floor(seconds / 3) * 10;
    user.energy = Math.min(user.energy + regen, 1500);
    user.lastUpdate = now;
    db.prepare('UPDATE users SET energy = ?, lastUpdate = ? WHERE id = ?')
      .run(user.energy, now, req.params.id);
  }
  res.json(user);

  const { id } = req.params;
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const now = Math.floor(Date.now() / 1000);

  if (!user) {
    db.prepare('INSERT INTO users (id, lastUpdate) VALUES (?, ?)').run(id, now);
    user = { id, balance: 0, energy: 1500, lastUpdate: now };
  } else {
    const seconds = now - user.lastUpdate;
    const regen = Math.floor(seconds / 3) * 10;
    user.energy = Math.min(user.energy + regen, 1500);
    user.lastUpdate = now;
    db.prepare('UPDATE users SET energy = ?, lastUpdate = ? WHERE id = ?')
      .run(user.energy, now, id);
  }
  res.json(user);
});

app.post('/api/tap', (req, res) => {
  const { id } = req.body;
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.energy <= 0) {
    return res.status(400).json({ error: 'No energy' });
  }

  user.balance += 1;
  user.energy -= 1;
  db.prepare('UPDATE users SET balance = ?, energy = ?, lastUpdate = ? WHERE id = ?')
    .run(user.balance, user.energy, Math.floor(Date.now() / 1000), id);
  res.json(user);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));