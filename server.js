const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nova-secret-change-me';
const DB_FILE = path.join(__dirname, 'db.json');
const DATABASE_URL = process.env.DATABASE_URL;
const NPBOX_URL = 'https://api.npoint.io/e4fd182923961ca329b0';

const CARD_NUMBER = '4441 1144 3770 6334';
const TELEGRAM = 'I1xD0';
const CLIENT_VERSION = '0.1.0';
const PAYMENT_PROVIDER = 'crypto';
const USDT_WALLET = 'TGRKziHYYbmvQ3JV5uMZqAjrrucAJHTMpv';
const USDT_NETWORK = 'TRC20 (Tron)';
const USD_RATES = { UAH: 41, RUB: 100, KZT: 500 };

const PLANS = [
  { id: 'week',      name: '1 \u043D\u0435\u0434\u0435\u043B\u044F',        priceUah: 15,  priceRub: 35,  priceKzt: 175,  days: 7,   lifetime: false },
  { id: 'month',     name: '1 \u043C\u0435\u0441\u044F\u0446',             priceUah: 50,  priceRub: 100, priceKzt: 575,  days: 30,  lifetime: false },
  { id: '3months',   name: '3 \u043C\u0435\u0441\u044F\u0446\u0430',       priceUah: 100, priceRub: 200, priceKzt: 1150, days: 90,  lifetime: false },
  { id: 'halfyear',  name: '6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432', priceUah: 150, priceRub: 300, priceKzt: 1725, days: 180, lifetime: false },
  { id: 'year',      name: '365 \u0434\u043D\u0435\u0439',                 priceUah: 200, priceRub: 400, priceKzt: 2300, days: 365, lifetime: false },
  { id: 'lifetime',  name: '\u041D\u0430\u0432\u0441\u0435\u0433\u0434\u0430 (Life)', priceUah: 300, priceRub: 550, priceKzt: 3450, days: 0, lifetime: true }
];

const PROMOS = {
  'Release': { discountPercent: 50, description: '\u0420\u0435\u043B\u0438\u0437 \u2014 \u0441\u043A\u0438\u0434\u043A\u0430 50%' }
};

// ===== PostgreSQL / JSON fallback =====
let pgPool = null;
let usePg = false;

async function initPg() {
  if (!DATABASE_URL) return;
  try {
    pgPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pgPool.query('CREATE TABLE IF NOT EXISTS nova_data (key TEXT PRIMARY KEY, value JSONB)');
    usePg = true;
    console.log('PostgreSQL connected');
    await seedOwner();
  } catch (e) { console.log('PG failed, using JSON:', e.message); }
}

async function loadDB() {
  if (usePg && pgPool) {
    const res = await pgPool.query('SELECT value FROM nova_data WHERE key = $1', ['main']);
    if (res.rows.length > 0) return res.rows[0].value;
    const seed = { users: [], orders: [], counter: 1 };
    await pgPool.query('INSERT INTO nova_data (key, value) VALUES ($1, $2)', ['main', JSON.stringify(seed)]);
    return seed;
  }
  try {
    const res = await fetch(NPBOX_URL);
    if (res.ok) {
      const data = await res.json();
      if (data && data.users) return data;
    }
  } catch (e) { console.log('npoint load failed:', e.message); }
  if (!fs.existsSync(DB_FILE)) { fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], orders: [], counter: 1 }, null, 2)); }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

async function saveDB(db) {
  if (usePg && pgPool) {
    await pgPool.query('UPDATE nova_data SET value = $1 WHERE key = $2', [JSON.stringify(db), 'main']);
    return;
  }
  try {
    await fetch(NPBOX_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(db) });
  } catch (e) { console.log('npoint save failed:', e.message); }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email || null, verified: u.verified || false, role: u.role, license: u.license, balance: u.balance, createdAt: u.createdAt, hwid: u.hwid || null };
}

function licenseValid(u) {
  if (!u.license || !u.license.active) return false;
  if (u.license.type === 'lifetime') return true;
  return u.license.expiresAt && u.license.expiresAt > Date.now();
}

async function seedOwner() {
  const db = await loadDB();
  const existing = db.users.find(u => u.username.toLowerCase() === 'n1x');
  const correctHash = bcrypt.hashSync('samturail', 10);
  if (!existing) {
    db.users.push({ id: db.counter++, username: 'N1x', passwordHash: correctHash, email: 'owner@nova.client', verified: true, role: 'owner', hwid: null, license: { type: 'lifetime', expiresAt: null, active: true }, balance: 0, createdAt: Date.now(), twoFactorCode: '7392' });
    await saveDB(db);
    console.log('Owner N1x created');
  } else {
    if (!bcrypt.compareSync('samturail', existing.passwordHash)) {
      existing.passwordHash = correctHash;
      existing.twoFactorCode = '7392';
      await saveDB(db);
      console.log('Owner N1x password fixed');
    }
    if (!existing.twoFactorCode) {
      existing.twoFactorCode = '7392';
      await saveDB(db);
    }
  }
}
initPg();
seedOwner();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false, maxAge: 0, setHeaders: (r) => { r.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); } }));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: '\u041D\u0435\u0442 \u0442\u043E\u043A\u0435\u043D\u0430' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u043E\u043A\u0435\u043D' }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') return res.status(403).json({ error: '\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0430\u0434\u043C\u0438\u043D\u043E\u0432' });
  next();
}

// ===== AUTH =====
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0441\u0435 \u043F\u043E\u043B\u044F' });
  if (username.length < 3) return res.status(400).json({ error: '\u041B\u043E\u0433\u0438\u043D \u043C\u0438\u043D\u0438\u043C\u0443\u043C 3 \u0441\u0438\u043C\u0432\u043E\u043B\u0430' });
  if (password.length < 4) return res.status(400).json({ error: '\u041F\u0430\u0440\u043E\u043B\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 4 \u0441\u0438\u043C\u0432\u043E\u043B\u0430' });
  const db = await loadDB();
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) return res.status(409).json({ error: '\u041B\u043E\u0433\u0438\u043D \u0437\u0430\u043D\u044F\u0442' });
  const u = { id: db.counter++, username, passwordHash: bcrypt.hashSync(password, 10), verified: true, role: 'user', hwid: null, license: { type: null, expiresAt: null, active: false }, balance: 0, createdAt: Date.now() };
  db.users.push(u);
  await saveDB(db);
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u) });
});

app.post('/api/verify', auth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: '\u041D\u0443\u0436\u0435\u043D \u043A\u043E\u0434' });
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: '\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  if (u.verified) return res.status(400).json({ error: '\u0423\u0436\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D' });
  if (u.verifyCode !== code) return res.status(400).json({ error: '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043E\u0434' });
  u.verified = true;
  await saveDB(db);
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u), verified: true });
});

app.post('/api/resend', auth, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u || u.verified) return res.status(400).json({ error: '\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0438\u043B\u0438 \u0443\u0436\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D' });
  res.json({ emailSent: false });
});

app.post('/api/login', async (req, res) => {
  const { username, password, twoFactorCode } = req.body;
  const db = await loadDB();
  const u = db.users.find(x => x.username.toLowerCase() === (username || '').toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.passwordHash)) return res.status(401).json({ error: '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C' });
  if (u.role === 'owner' && u.twoFactorCode) {
    if (twoFactorCode !== u.twoFactorCode) return res.status(403).json({ error: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 2FA \u043A\u043E\u0434', need2fa: true });
  }
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u) });
});

app.get('/api/me', auth, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: '\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  res.json(publicUser(u));
});

// ===== PLANS / PROMO / CONFIG =====
app.get('/api/plans', (_, res) => res.json(PLANS));
app.get('/api/config', (_, res) => res.json({ telegram: TELEGRAM, cardNumber: CARD_NUMBER, plans: PLANS, paymentProvider: PAYMENT_PROVIDER, usdtWallet: USDT_WALLET, usdtNetwork: USDT_NETWORK, usdRates: USD_RATES, clientVersion: CLIENT_VERSION }));

app.post('/api/promo/validate', (req, res) => {
  const { code, planId } = req.body;
  const promo = PROMOS[(code || '').trim()];
  if (!promo) return res.status(404).json({ error: '\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: '\u0422\u0430\u0440\u0438\u0444 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  res.json({ code, discountPercent: promo.discountPercent, description: promo.description, discountedUah: +(plan.priceUah * (1 - promo.discountPercent / 100)).toFixed(2) });
});

// ===== ORDERS =====
app.post('/api/order', auth, async (req, res) => {
  const { planId, promoCode } = req.body;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: '\u0422\u0430\u0440\u0438\u0444 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  let amount = plan.priceUah, discount = 0;
  if (promoCode) { const promo = PROMOS[promoCode.trim()]; if (promo) { discount = promo.discountPercent; amount = +(plan.priceUah * (1 - discount / 100)).toFixed(2); } }
  const db = await loadDB();
  const order = { id: db.counter++, userId: req.user.id, planId, planName: plan.name, amount, discountPercent: discount, promoCode: promoCode || null, currency: 'UAH', cardNumber: CARD_NUMBER, telegram: TELEGRAM, status: 'pending_payment', createdAt: Date.now() };
  db.orders.push(order);
  await saveDB(db);
  res.json(order);
});

app.get('/api/orders', auth, async (req, res) => {
  const db = await loadDB();
  res.json(db.orders.filter(o => o.userId === req.user.id));
});

// ===== ADMIN =====
app.get('/api/admin/orders', auth, adminOnly, async (_, res) => { const db = await loadDB(); res.json(db.orders); });

app.post('/api/admin/order/:id/approve', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const o = db.orders.find(x => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ error: '\u0417\u0430\u043A\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  const u = db.users.find(x => x.id === o.userId);
  if (!u) return res.status(404).json({ error: '\u042E\u0437\u0435\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  const plan = PLANS.find(p => p.id === o.planId);
  if (plan.lifetime) u.license = { type: 'lifetime', expiresAt: null, active: true };
  else { const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now(); u.license = { type: plan.id, expiresAt: base + plan.days * 86400000, active: true }; }
  o.status = 'approved'; o.approvedAt = Date.now();
  await saveDB(db);
  res.json({ order: o, user: publicUser(u) });
});

app.post('/api/admin/order/:id/reject', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const o = db.orders.find(x => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ error: '\u0417\u0430\u043A\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  o.status = 'rejected'; await saveDB(db); res.json(o);
});

app.get('/api/admin/users', auth, adminOnly, async (_, res) => { const db = await loadDB(); res.json(db.users.map(publicUser)); });

app.post('/api/admin/user/:id/grant', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: '\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  const plan = PLANS.find(p => p.id === req.body.planId);
  if (!plan) return res.status(400).json({ error: '\u0422\u0430\u0440\u0438\u0444 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  if (plan.lifetime) u.license = { type: 'lifetime', expiresAt: null, active: true };
  else { const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now(); u.license = { type: plan.id, expiresAt: base + plan.days * 86400000, active: true }; }
  await saveDB(db); res.json(publicUser(u));
});

app.post('/api/admin/user/:id/revoke', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: '\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  u.license = { type: null, expiresAt: null, active: false };
  await saveDB(db); res.json(publicUser(u));
});

app.post('/api/admin/user/:id/reset-hwid', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: '\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D' });
  u.hwid = null; await saveDB(db); res.json(publicUser(u));
});

// ===== LAUNCHER API =====
app.post('/api/launcher/auth', async (req, res) => {
  const { username, password, hwid } = req.body;
  const db = await loadDB();
  const u = db.users.find(x => x.username.toLowerCase() === (username || '').toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.passwordHash)) return res.status(401).json({ error: '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C' });
  if (!hwid) return res.status(400).json({ error: 'HWID \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u043D' });
  if (!u.hwid) { u.hwid = hwid; await saveDB(db); }
  else if (u.hwid !== hwid) return res.status(403).json({ error: '\u0414\u0440\u0443\u0433\u043E\u0439 HWID. \u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438.' });
  const valid = licenseValid(u);
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u), licenseValid: valid, license: u.license, cardNumber: CARD_NUMBER });
});

app.get('/api/launcher/validate', auth, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ valid: false });
  res.json({ valid: licenseValid(u), license: u.license, user: publicUser(u) });
});

// ===== UPDATE SYSTEM =====
app.get('/api/client/version', (_, res) => res.json({ version: CLIENT_VERSION }));
app.get('/api/client/download', (_, res) => {
  res.redirect('https://github.com/Nova-Client1488/nova/releases/download/v1.0/Nova.Launcher.0.1.0.exe');
});
app.get('/api/client/jar', (_, res) => {
  const jar = path.join(__dirname, 'downloads', 'nova-client.jar');
  if (fs.existsSync(jar)) return res.download(jar, 'nova-client.jar');
  res.status(404).json({ error: 'Jar \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430' });
});

// ===== SPA ROUTES =====
app.get(['/login', '/register', '/dashboard', '/checkout', '/purchase', '/admin', '/pricing'], (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Nova Web: http://0.0.0.0:${PORT}`));
