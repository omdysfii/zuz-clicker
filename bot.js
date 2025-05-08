const { Telegraf } = require('telegraf');
const Database = require('better-sqlite3');
const db = new Database('zuz.db');
const bot = new Telegraf('7777891771:AAEuth9hL2JfmqQyCq7mPZSyqioKFv_CH5o');

const MAX_ENERGY = 1500;
const RECHARGE_RATE = 10;

function createOrUpdateUser(id, ref = null) {
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const now = Math.floor(Date.now() / 1000);

  if (!user) {
    db.prepare('INSERT INTO users (id, lastUpdate, inviter) VALUES (?, ?, ?)').run(id, now, ref);
    if (ref) {
      db.prepare('UPDATE users SET balance = balance + 300 WHERE id = ?').run(ref);
    }
    user = { id, balance: 0, energy: MAX_ENERGY, lastUpdate: now };
  } else {
    const secondsPassed = now - user.lastUpdate;
    const gained = Math.floor(secondsPassed / 3) * RECHARGE_RATE;
    user.energy = Math.min(user.energy + gained, MAX_ENERGY);
    user.lastUpdate = now;
    db.prepare('UPDATE users SET energy = ?, lastUpdate = ? WHERE id = ?')
      .run(user.energy, now, id);
  }

  return user;
}

bot.start((ctx) => {
  const id = String(ctx.from.id);
  const ref = ctx.startPayload ? String(ctx.startPayload) : null;
  const user = createOrUpdateUser(id, ref);
  ctx.reply(`Welcome ${ctx.from.first_name}!
Balance: ${user.balance}
Energy: ⚡ ${user.energy}/${MAX_ENERGY}`);
});

bot.command('tap', (ctx) => {
  const id = String(ctx.from.id);
  const user = createOrUpdateUser(id);
  if (user.energy <= 0) {
    return ctx.reply('⚠️ No energy! Wait a bit to recharge.');
  }
  user.balance += 1;
  user.energy -= 1;
  db.prepare('UPDATE users SET balance = ?, energy = ?, lastUpdate = ? WHERE id = ?')
    .run(user.balance, user.energy, Math.floor(Date.now() / 1000), id);
  ctx.reply(`+1 Coin!
Balance: ${user.balance}
Energy: ⚡ ${user.energy}`);
});

bot.launch();
console.log("Telegram bot is running.");
