// Nova Web - Deno Deploy version
// Uses Web Crypto API (PBKDF2 for password hashing, HMAC-SHA256 for JWT)
// Uses Deno KV for persistent storage (free on Deno Deploy)


const PORT = Deno.env.get("PORT") || 3000;
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "nova-jwt-secret-CHANGE-2026";

// ===== КОНФИГ =====
const CARD_NUMBER = '4441 1144 3770 6334';
const TELEGRAM = 'I1xD0';
const CLIENT_VERSION = '0.1.0';
const PAYMENT_PROVIDER = 'crypto';
const USDT_WALLET = 'TGRKziHYYbmvQ3JV5uMZqAjrrucAJHTMpv';
const USDT_NETWORK = 'TRC20 (Tron)';
const USD_RATES = { UAH: 41, RUB: 100, KZT: 500 };

const PLANS = [
  { id: 'month',     name: '1 месяц',         priceUah: 50,  priceRub: 100, priceKzt: 575,  days: 30,  lifetime: false },
  { id: 'halfyear',  name: '6 месяцев',       priceUah: 125, priceRub: 250, priceKzt: 1438, days: 180, lifetime: false },
  { id: 'lifetime',  name: 'Навсегда (Life)', priceUah: 250, priceRub: 400, priceKzt: 2875, days: 0,   lifetime: true  }
];

const PROMOS = {
  'Release': { discountPercent: 50, description: 'Релиз — скидка 50%' }
};

// ===== DENO KV STORE (optional, fallback to in-memory) =====
let kv = null;
try {
  kv = await Deno.openKv();
} catch (e) {
  console.log('KV not available, using in-memory store');
}

// In-memory fallback
const memStore = { users: [], orders: [], counter: 1 };
async function getMem(key) { return memStore[key]; }
async function setMem(key, val) { memStore[key] = val; }

// ===== CRYPTO HELPERS =====
async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const combined = new Uint8Array(salt.length + hash.byteLength);
  combined.set(salt, 0);
  combined.set(new Uint8Array(hash), salt.length);
  return b64(combined);
}

async function verifyPassword(password, stored) {
  try {
    const combined = ub64(stored);
    const salt = combined.slice(0, 16);
    const origHash = combined.slice(16);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    return arrEq(new Uint8Array(hash), origHash);
  } catch { return false; }
}

function b64(arr) { return btoa(String.fromCharCode(...arr)); }
function ub64(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }
function arrEq(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

async function makeJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = new TextEncoder();
  const h = btoa(JSON.stringify(header)).replace(/=/g, '');
  const p = btoa(JSON.stringify({ ...payload, exp: Date.now() + 30 * 86400000 })).replace(/=/g, '');
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '')}`;
}

async function verifyJwt(token) {
  try {
    const [h, p, s] = token.split('.');
    const data = `${h}.${p}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = ub64(s);
    const valid = await crypto.subtle.verify('HMAC', key, enc.encode(data), sig);
    if (!valid) return null;
    const payload = JSON.parse(atob(p));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

// ===== KV HELPERS =====
async function getUsers() {
  if (kv) { const res = await kv.get(['users']); return res.value || []; }
  return await getMem('users');
}
async function setUsers(users) {
  if (kv) { await kv.set(['users'], users); return; }
  await setMem('users', users);
}
async function getOrders() {
  if (kv) { const res = await kv.get(['orders']); return res.value || []; }
  return await getMem('orders');
}
async function setOrders(orders) {
  if (kv) { await kv.set(['orders'], orders); return; }
  await setMem('orders', orders);
}
async function getCounter() {
  if (kv) { const res = await kv.get(['counter']); return res.value || 1; }
  return await getMem('counter');
}
async function setCounter(c) {
  if (kv) { await kv.set(['counter'], c); return; }
  await setMem('counter', c);
}

function publicUser(u) {
  return { id: u.id, username: u.username, role: u.role, license: u.license, balance: u.balance, createdAt: u.createdAt, hwid: u.hwid || null };
}

function licenseValid(u) {
  if (!u.license || !u.license.active) return false;
  if (u.license.type === 'lifetime') return true;
  return u.license.expiresAt && u.license.expiresAt > Date.now();
}

// ===== SEED OWNER =====
async function seedOwner() {
  const users = await getUsers();
  if (!users.find(u => u.username.toLowerCase() === 'n1x')) {
    const hash = await hashPassword('samturail');
    users.push({
      id: 1, username: 'N1x', passwordHash: hash, role: 'owner', hwid: null,
      license: { type: 'lifetime', expiresAt: null, active: true }, balance: 0, createdAt: Date.now()
    });
    await setUsers(users);
    await setCounter(2);
    console.log('Owner N1x created');
  }
}
await seedOwner();

// ===== SERVER =====
const serve = async (req) => {
  const url = new URL(req.url);
  let path = url.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const method = req.method;
  console.log(`[REQ] ${method} ${path}`);

  // CORS + JSON
  const json = async () => {
    try { return JSON.parse(await req.text()); } catch { return {}; }
  };
  const sendJson = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const sendFile = (filePath, contentType) => {
    try { return new Response(Deno.readTextFileSync(filePath), { headers: { 'Content-Type': contentType } }); }
    catch { return new Response('Not found', { status: 404 }); }
  };

  // Auth middleware
  const authHeader = req.headers.get('authorization') || '';
  let authUser = null;
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    authUser = await verifyJwt(token);
  }
  const adminOnly = () => authUser && (authUser.role === 'owner' || authUser.role === 'admin');

  // ===== AUTH =====
  if (path === '/api/register' && method === 'POST') {
    const { username, password } = await json();
    if (!username || !password) return sendJson({ error: 'Введите логин и пароль' }, 400);
    if (username.length < 3) return sendJson({ error: 'Логин минимум 3' }, 400);
    if (password.length < 4) return sendJson({ error: 'Пароль минимум4' }, 400);
    const users = await getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) return sendJson({ error: 'Логин занят' }, 409);
    const hash = await hashPassword(password);
    const id = await getCounter();
    const u = { id, username, passwordHash: hash, role: 'user', hwid: null, license: { type: null, expiresAt: null, active: false }, balance: 0, createdAt: Date.now() };
    users.push(u);
    await setUsers(users);
    await setCounter(id + 1);
    const token = await makeJwt({ id: u.id, username: u.username, role: u.role });
    return sendJson({ token, user: publicUser(u) });
  }

  if (path === '/api/login' && method === 'POST') {
    const { username, password } = await json();
    const users = await getUsers();
    const u = users.find(x => x.username.toLowerCase() === (username || '').toLowerCase());
    if (!u || !(await verifyPassword(password || '', u.passwordHash))) return sendJson({ error: 'Неверный логин или пароль' }, 401);
    const token = await makeJwt({ id: u.id, username: u.username, role: u.role });
    return sendJson({ token, user: publicUser(u) });
  }

  if (path === '/api/me' && method === 'GET') {
    if (!authUser) return sendJson({ error: 'Не найден' }, 404);
    const users = await getUsers();
    const u = users.find(x => x.id === authUser.id);
    if (!u) return sendJson({ error: 'Не найден' }, 404);
    return sendJson(publicUser(u));
  }

  // ===== PLANS / PROMO =====
  if ((path === '/api/plans' || path === '/api/plans/') && method === 'GET') return sendJson(PLANS);
  if (path === '/api/config' && method === 'GET') return sendJson({
    telegram: TELEGRAM, cardNumber: CARD_NUMBER, plans: PLANS,
    paymentProvider: PAYMENT_PROVIDER, usdtWallet: USDT_WALLET, usdtNetwork: USDT_NETWORK, usdRates: USD_RATES, clientVersion: CLIENT_VERSION
  });

  // Debug endpoint
  if (path === '/api/debug' && method === 'GET') return sendJson({ path, method, url: req.url, pathLen: path.length, pathChars: [...path].map(c => c.charCodeAt(0)) });

  if (path === '/api/promo/validate' && method === 'POST') {
    const { code, planId } = await json();
    const promo = PROMOS[(code || '').trim()];
    if (!promo) return sendJson({ error: 'Промокод не найден' }, 404);
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return sendJson({ error: 'Тариф не найден' }, 400);
    const discounted = +(plan.priceUah * (1 - promo.discountPercent / 100)).toFixed(2);
    return sendJson({ code, discountPercent: promo.discountPercent, description: promo.description, discountedUah: discounted });
  }

  // ===== ORDERS =====
  if (path === '/api/order' && method === 'POST') {
    if (!authUser) return sendJson({ error: 'Нет токена' }, 401);
    const { planId, promoCode } = await json();
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return sendJson({ error: 'Тариф не найден' }, 400);
    let amount = plan.priceUah, discount = 0;
    if (promoCode) { const promo = PROMOS[promoCode.trim()]; if (promo) { discount = promo.discountPercent; amount = +(plan.priceUah * (1 - discount / 100)).toFixed(2); } }
    const orders = await getOrders();
    const id = await getCounter();
    const order = { id, userId: authUser.id, planId, planName: plan.name, amount, discountPercent: discount, promoCode: promoCode || null, currency: 'UAH', cardNumber: CARD_NUMBER, telegram: TELEGRAM, status: 'pending_payment', createdAt: Date.now() };
    orders.push(order);
    await setOrders(orders);
    await setCounter(id + 1);
    return sendJson(order);
  }

  if (path === '/api/orders' && method === 'GET') {
    if (!authUser) return sendJson({ error: 'Нет токена' }, 401);
    const orders = await getOrders();
    return sendJson(orders.filter(o => o.userId === authUser.id));
  }

  // ===== ADMIN =====
  if (path === '/api/admin/orders' && method === 'GET') {
    if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
    return sendJson(await getOrders());
  }

  if (path.startsWith('/api/admin/order/') && path.endsWith('/approve') && method === 'POST') {
    if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
    const id = Number(path.split('/')[3]);
    const orders = await getOrders();
    const o = orders.find(x => x.id === id);
    if (!o) return sendJson({ error: 'Заказ не найден' }, 404);
    const users = await getUsers();
    const u = users.find(x => x.id === o.userId);
    if (!u) return sendJson({ error: 'Юзер не найден' }, 404);
    const plan = PLANS.find(p => p.id === o.planId);
    if (plan.lifetime) u.license = { type: 'lifetime', expiresAt: null, active: true };
    else { const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now(); u.license = { type: plan.id, expiresAt: base + plan.days * 86400000, active: true }; }
    o.status = 'approved'; o.approvedAt = Date.now();
    await setOrders(orders); await setUsers(users);
    return sendJson({ order: o, user: publicUser(u) });
  }

  if (path.startsWith('/api/admin/order/') && path.endsWith('/reject') && method === 'POST') {
    if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
    const id = Number(path.split('/')[3]);
    const orders = await getOrders();
    const o = orders.find(x => x.id === id);
    if (!o) return sendJson({ error: 'Заказ не найден' }, 404);
    o.status = 'rejected';
    await setOrders(orders);
    return sendJson(o);
  }

  if (path === '/api/admin/users' && method === 'GET') {
    if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
    return sendJson((await getUsers()).map(publicUser));
  }

  if (path.startsWith('/api/admin/user/') && path.endsWith('/grant') && method === 'POST') {
    if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
    const id = Number(path.split('/')[3]);
    const { planId } = await json();
    const users = await getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return sendJson({ error: 'Не найден' }, 404);
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return sendJson({ error: 'Тариф не найден' }, 400);
    if (plan.lifetime) u.license = { type: 'lifetime', expiresAt: null, active: true };
    else { const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now(); u.license = { type: plan.id, expiresAt: base + plan.days * 86400000, active: true }; }
    await setUsers(users);
    return sendJson(publicUser(u));
  }

  if (path.startsWith('/api/admin/user/') && path.endsWith('/revoke') && method === 'POST') {
    if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
    const id = Number(path.split('/')[3]);
    const users = await getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return sendJson({ error: 'Не найден' }, 404);
    u.license = { type: null, expiresAt: null, active: false };
    await setUsers(users);
    return sendJson(publicUser(u));
  }

  if (path.startsWith('/api/admin/user/') && path.endsWith('/reset-hwid') && method === 'POST') {
    if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
    const id = Number(path.split('/')[3]);
    const users = await getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return sendJson({ error: 'Не найден' }, 404);
    u.hwid = null;
    await setUsers(users);
    return sendJson(publicUser(u));
  }

  // ===== LAUNCHER API =====
  if (path === '/api/launcher/auth' && method === 'POST') {
    const { username, password, hwid } = await json();
    const users = await getUsers();
    const u = users.find(x => x.username.toLowerCase() === (username || '').toLowerCase());
    if (!u || !(await verifyPassword(password || '', u.passwordHash))) return sendJson({ error: 'Неверный логин или пароль' }, 401);
    if (!hwid) return sendJson({ error: 'HWID не передан' }, 400);
    if (!u.hwid) { u.hwid = hwid; await setUsers(users); }
    else if (u.hwid !== hwid) return sendJson({ error: 'Другой HWID. Обратитесь к администрации для сброса.' }, 403);
    const valid = licenseValid(u);
    const token = await makeJwt({ id: u.id, username: u.username, role: u.role });
    return sendJson({ token, user: publicUser(u), licenseValid: valid, license: u.license, cardNumber: CARD_NUMBER });
  }

  if (path === '/api/launcher/validate' && method === 'GET') {
    if (!authUser) return sendJson({ valid: false }, 404);
    const users = await getUsers();
    const u = users.find(x => x.id === authUser.id);
    if (!u) return sendJson({ valid: false }, 404);
    return sendJson({ valid: licenseValid(u), license: u.license, user: publicUser(u) });
  }

  // ===== UPDATE SYSTEM =====
  if (path === '/api/client/version' && method === 'GET') return sendJson({ version: CLIENT_VERSION });
  if (path === '/api/client/download' && method === 'GET') {
    try {
      const data = await Deno.readFile('downloads/nova-client.jar');
      return new Response(data, { headers: { 'Content-Type': 'application/java-archive', 'Content-Disposition': 'attachment; filename="nova-client.jar"' } });
    } catch { return sendJson({ error: 'Jar не найдена' }, 404); }
  }

// SPA routes
  const spaRoutes = ['/login', '/register', '/dashboard', '/checkout', '/purchase', '/admin', '/pricing'];
  if (method === 'GET' && spaRoutes.includes(path)) return sendFile('public/index.html', 'text/html');

  // Static files - serve from public/ directly (no Deno Deploy static dir needed)
  if (method === 'GET') {
    let filePath = 'public' + (path === '/' ? '/index.html' : path);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
    try {
      const data = await Deno.readFile(filePath);
      const ext = filePath.substring(filePath.lastIndexOf('.'));
      const contentType = types[ext] || 'application/octet-stream';
      return new Response(data, { headers: { 'Content-Type': contentType } });
    } catch {}
  }

  return sendJson({ error: 'Not found' }, 404);
};

console.log(`Nova Web (Deno): http://localhost:${PORT}`);
Deno.serve({ port: Number(PORT), hostname: '0.0.0.0' }, serve);
