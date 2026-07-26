const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nova-secret-change-me-please';
const DB_FILE = path.join(__dirname, 'db.json');
const DATABASE_URL = process.env.DATABASE_URL;
const LAUNCHER_DIR = process.env.LAUNCHER_DIR || '';

// ===== POSTGRESQL (Render) / JSON fallback =====
let pgPool = null;
let usePg = false;

async function initPg() {
  if (!DATABASE_URL) return;
  try {
    pgPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS nova_data (
        key TEXT PRIMARY KEY,
        value JSONB
      )
    `);
    usePg = true;
    console.log('PostgreSQL connected');
    await seedOwner();
  } catch (e) { console.log('PostgreSQL failed, using JSON:', e.message); }
}

async function loadDB() {
  if (usePg && pgPool) {
    const res = await pgPool.query('SELECT value FROM nova_data WHERE key = $1', ['main']);
    if (res.rows.length > 0) return res.rows[0].value;
    const seed = { users: [], orders: [], counter: 1 };
    await pgPool.query('INSERT INTO nova_data (key, value) VALUES ($1, $2)', ['main', JSON.stringify(seed)]);
    return seed;
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = { users: [], orders: [], counter: 1 };
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

async function saveDB(db) {
  if (usePg && pgPool) {
    await pgPool.query('UPDATE nova_data SET value = $1 WHERE key = $2', [JSON.stringify(db), 'main']);
    return;
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

initPg();

// ===== КОНФИГ =====
const CARD_NUMBER = '4441 1144 3770 6334';
const KZT_PER_UAH = 11.5; // курс тенге за гривну
const RUB_PER_UAH = 2.0;  // курс рублей за гривну (50 грн = 100 ₽)
const TELEGRAM = 'I1xD0'; // твой Telegram для реселлера
const CLIENT_VERSION = '0.1.0';
// Платёжный провайдер: 'paypal' | 'liqpay' | 'crypto' | 'none'
const PAYMENT_PROVIDER = 'crypto';
// ===== КРИПТА (USDT TRC20) =====
const USDT_WALLET = 'TGRKziHYYbmvQ3JV5uMZqAjrrucAJHTMpv';
const USDT_NETWORK = 'TRC20 (Tron)';
// Курсы к USD (обновляй при необходимости). 1 USDT ≈ 1 USD
const USD_RATES = { UAH: 41, RUB: 100, KZT: 500 };
// Ключи вставишь после регистрации в платёжной системе
const PAYPAL_CLIENT_ID = '';
const LIQPAY_PUBLIC_KEY = '';
const LIQPAY_PRIVATE_KEY = '';

const PLANS = [
  { id: 'week',      name: '1 неделя',        priceUah: 15,  priceRub: 35,  priceKzt: 175,  days: 7,   lifetime: false },
  { id: 'month',     name: '1 месяц',         priceUah: 50,  priceRub: 100, priceKzt: 575,  days: 30,  lifetime: false },
  { id: '3months',   name: '3 месяца',        priceUah: 100, priceRub: 200, priceKzt: 1150, days: 90,  lifetime: false },
  { id: 'halfyear',  name: '6 месяцев',       priceUah: 150, priceRub: 300, priceKzt: 1725, days: 180, lifetime: false },
  { id: 'year',      name: '365 дней',        priceUah: 200, priceRub: 400, priceKzt: 2300, days: 365, lifetime: false },
  { id: 'lifetime',  name: 'Навсегда (Life)', priceUah: 300, priceRub: 550, priceKzt: 3450, days: 0,   lifetime: true  }
];

const PROMOS = {
  'Release': { discountPercent: 50, description: 'Релиз — скидка 50%' }
};

// ===== СИД ВЛАДЕЛЬЦА =====
async function seedOwner() {
  const db = await loadDB();
  if (!db.users.find(u => u.username.toLowerCase() === 'n1x')) {
    const hash = bcrypt.hashSync('samturail', 10);
    db.users.push({
      id: db.counter++,
      username: 'N1x',
      passwordHash: hash,
      role: 'owner',
      hwid: null,
      license: { type: 'lifetime', expiresAt: null, active: true },
      balance: 0,
      createdAt: Date.now()
    });
    await saveDB(db);
    console.log('Owner N1x created');
  }
}
seedOwner();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); }
}));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Нет токена' });
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Неверный токен' }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') return res.status(403).json({ error: 'Только для админов' });
  next();
}

function publicUser(u) {
  return {
    id: u.id, username: u.username, role: u.role,
    license: u.license, balance: u.balance, createdAt: u.createdAt,
    hwid: u.hwid || null
  };
}

function licenseValid(u) {
  if (!u.license || !u.license.active) return false;
  if (u.license.type === 'lifetime') return true;
  return u.license.expiresAt && u.license.expiresAt > Date.now();
}

// ===== AUTH =====
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Введите логин и пароль' });
  if (username.length < 3) return res.status(400).json({ error: 'Логин минимум 3 символа' });
  if (password.length < 4) return res.status(400).json({ error: 'Пароль минимум 4 символа' });
  const db = await loadDB();
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.status(409).json({ error: 'Логин занят' });
  const hash = bcrypt.hashSync(password, 10);
  const u = { id: db.counter++, username, passwordHash: hash, role: 'user', hwid: null,
    license: { type: null, expiresAt: null, active: false }, balance: 0, createdAt: Date.now() };
  db.users.push(u); await saveDB(db);
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u) });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await loadDB();
  const u = db.users.find(x => x.username.toLowerCase() === (username||'').toLowerCase());
  if (!u || !bcrypt.compareSync(password||'', u.passwordHash)) return res.status(401).json({ error: 'Неверный логин или пароль' });
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u) });
});

app.get('/api/me', auth, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: 'Не найден' });
  res.json(publicUser(u));
});

// ===== ТАРИФЫ / ПРОМО =====
app.get('/api/plans', (_, res) => res.json(PLANS));

app.post('/api/promo/validate', async (req, res) => {
  const { code, planId, currency } = req.body;
  const promo = PROMOS[(code||'').trim()];
  if (!promo) return res.status(404).json({ error: 'Промокод не найден' });
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: 'Тариф не найден' });
  const base = currency === 'RUB' ? plan.priceRub : plan.priceUah;
  const cur = currency === 'RUB' ? 'Rub' : 'Uah';
  const key = 'discounted' + cur;
  const discounted = +(base * (1 - promo.discountPercent/100)).toFixed(2);
  res.json({ code, discountPercent: promo.discountPercent, description: promo.description,
    original: base, discounted, currency: currency || 'UAH', [key]: discounted,
    originalUah: plan.priceUah, discountedUah: currency === 'RUB' ? null : discounted });
});

// ===== ЗАКАЗЫ =====
app.post('/api/order', auth, async (req, res) => {
  const { planId, promoCode, currency } = req.body;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: 'Тариф не найден' });
  const cur = currency || 'UAH';
  const base = cur === 'RUB' ? plan.priceRub : plan.priceUah;
  let amount = base;
  let discount = 0;
  if (promoCode) {
    const promo = PROMOS[promoCode.trim()];
    if (promo) { discount = promo.discountPercent; amount = +(base * (1 - discount/100)).toFixed(2); }
  }
  const db = await loadDB();
  const order = {
    id: db.counter++, userId: req.user.id, planId, planName: plan.name,
    amount: amount, discountPercent: discount, promoCode: promoCode || null,
    currency: cur, amountPayable: amount,
    cardNumber: CARD_NUMBER, telegram: TELEGRAM,
    status: 'pending_payment', createdAt: Date.now()
  };
  db.orders.push(order); await saveDB(db);
  res.json(order);
});

app.get('/api/orders', auth, async (req, res) => {
  const db = await loadDB();
  res.json(db.orders.filter(o => o.userId === req.user.id));
});

app.post('/api/order/:id/confirm', auth, async (req, res) => {
  const db = await loadDB();
  const o = db.orders.find(x => x.id === Number(req.params.id) && x.userId === req.user.id);
  if (!o) return res.status(404).json({ error: 'Заказ не найден' });
  if (o.status !== 'pending_payment') return res.status(400).json({ error: 'Уже обработан' });
  o.status = 'waiting_approval'; await saveDB(db);
  res.json(o);
});

// ===== АДМИН =====
app.get('/api/admin/orders', auth, adminOnly, async (_, res) => {
  const db = await loadDB();
  res.json(db.orders);
});

app.post('/api/admin/order/:id/approve', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const o = db.orders.find(x => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'Заказ не найден' });
  const u = db.users.find(x => x.id === o.userId);
  if (!u) return res.status(404).json({ error: 'Юзер не найден' });
  const plan = PLANS.find(p => p.id === o.planId);
  if (plan.lifetime) {
    u.license = { type: 'lifetime', expiresAt: null, active: true };
  } else {
    const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now();
    u.license = { type: plan.id, expiresAt: base + plan.days*86400000, active: true };
  }
  o.status = 'approved'; o.approvedAt = Date.now(); await saveDB(db);
  res.json({ order: o, user: publicUser(u) });
});

app.post('/api/admin/order/:id/reject', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const o = db.orders.find(x => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'Заказ не найден' });
  o.status = 'rejected'; await saveDB(db); res.json(o);
});

app.get('/api/admin/users', auth, adminOnly, async (_, res) => {
  const db = await loadDB();
  res.json(db.users.map(publicUser));
});

app.post('/api/admin/user/:id/role', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Не найден' });
  u.role = req.body.role; await saveDB(db); res.json(publicUser(u));
});

// ===== АДМИН: ВЫДАТЬ ПОДПИСКУ =====
app.post('/api/admin/user/:id/grant', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Не найден' });
  const plan = PLANS.find(p => p.id === req.body.planId);
  if (!plan) return res.status(400).json({ error: 'Тариф не найден' });
  if (plan.lifetime) {
    u.license = { type: 'lifetime', expiresAt: null, active: true };
  } else {
    const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now();
    u.license = { type: plan.id, expiresAt: base + plan.days*86400000, active: true };
  }
  await saveDB(db);
  res.json(publicUser(u));
});

app.post('/api/admin/user/:id/revoke', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Не найден' });
  u.license = { type: null, expiresAt: null, active: false };
  await saveDB(db); res.json(publicUser(u));
});

app.get('/api/config', (_, res) => res.json({
  telegram: TELEGRAM, cardNumber: CARD_NUMBER, plans: PLANS,
  paymentProvider: PAYMENT_PROVIDER,
  paypalClientId: PAYPAL_CLIENT_ID,
  liqpayPublicKey: LIQPAY_PUBLIC_KEY,
  usdtWallet: USDT_WALLET, usdtNetwork: USDT_NETWORK, usdRates: USD_RATES,
  clientVersion: CLIENT_VERSION
}));

// ===== UPDATE SYSTEM =====
app.get('/api/client/version', (_, res) => res.json({ version: CLIENT_VERSION }));
app.get('/api/client/download', async (_, res) => {
  const jar = path.join(__dirname, 'downloads', 'nova-client.jar');
  if (fs.existsSync(jar)) return res.download(jar, 'nova-client.jar');
  res.status(404).json({ error: 'Jar не найден. Соберите клиент сначала.' });
});
app.post('/api/client/upload', auth, adminOnly, async (req, res) => {
  // Админ загружает новую jar (через multipart или base64)
  res.json({ ok: true, msg: 'Используйте /api/client/upload-jar для загрузки файла' });
});

// ===== LAUNCHER API =====
app.post('/api/launcher/auth', async (req, res) => {
  const { username, password, hwid } = req.body;
  const db = await loadDB();
  const u = db.users.find(x => x.username.toLowerCase() === (username||'').toLowerCase());
  if (!u || !bcrypt.compareSync(password||'', u.passwordHash)) return res.status(401).json({ error: 'Неверный логин или пароль' });
  // ===== HWID ПРИВЯЗКА =====
  if (!hwid) return res.status(400).json({ error: 'HWID не передан' });
  if (!u.hwid) {
    u.hwid = hwid;
    await saveDB(db);
  } else if (u.hwid !== hwid) {
    return res.status(403).json({ error: 'Другой HWID. Этот аккаунт привязан к другому компьютеру. Обратитесь к администрации для сброса привязки.' });
  }
  const valid = licenseValid(u);
  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(u), licenseValid: valid,
    license: u.license, cardNumber: CARD_NUMBER });
});

// ===== АДМИН: СБРОС HWID =====
app.post('/api/admin/user/:id/reset-hwid', auth, adminOnly, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Не найден' });
  u.hwid = null; await saveDB(db);
  res.json(publicUser(u));
});

app.get('/api/launcher/validate', auth, async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ valid: false });
  res.json({ valid: licenseValid(u), license: u.license, user: publicUser(u) });
});

// ===== ПЛАТЁЖНЫЙ ШЛЮЗ =====
app.post('/api/payment/create', auth, async (req, res) => {
  const { planId, currency, promoCode } = req.body;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: 'Тариф не найден' });
  const base = currency === 'RUB' ? plan.priceRub : currency === 'KZT' ? plan.priceKzt : plan.priceUah;
  let amount = base, discount = 0;
  if (promoCode) { const promo = PROMOS[promoCode.trim()]; if (promo) { discount = promo.discountPercent; amount = +(base * (1 - discount/100)).toFixed(2); } }
  const orderRef = 'NOVA-' + Date.now() + '-' + req.user.id;
  const db = await loadDB();
  const order = {
    id: db.counter++, userId: req.user.id, planId, planName: plan.name,
    amount: amount, currency: currency || 'UAH', discountPercent: discount, promoCode: promoCode || null,
    reference: orderRef, status: 'pending_payment', createdAt: Date.now(),
    method: 'card'
  };
  db.orders.push(order); await saveDB(db);
  // Здесь возвращаем данные для PayPal/LiqPay. Без ключей — только заказ.
  res.json({
    orderId: order.id, reference: orderRef, amount, currency: currency || 'UAH',
    provider: PAYMENT_PROVIDER, planName: plan.name
  });
});

app.post('/api/payment/webhook', async (req, res) => {
  // Webhook от платёжной системы после оплаты. Без ключей не работает.
  // Здесь: найти заказ по reference, поставить status=approved, выдать лицензию.
  res.json({ ok: true });
});
app.get('/api/download/launcher', async (_, res) => {
  const exe = path.join(LAUNCHER_DIR, 'dist', 'Nova Launcher.exe');
  if (fs.existsSync(exe)) return res.download(exe, 'NovaLauncher.exe');
  const zip = path.join(__dirname, 'downloads', 'NovaLauncher.zip');
  if (fs.existsSync(zip)) return res.download(zip, 'NovaLauncher.zip');
  res.status(404).send('Лаунчер пока не собран. Запустите build-launcher.bat');
});

// ===== SPA routes =====
app.get(['/login','/register','/dashboard','/checkout','/purchase','/admin','/pricing'], (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Nova Web: http://0.0.0.0:${PORT}`));
