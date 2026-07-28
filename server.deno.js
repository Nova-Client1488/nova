// Nova Web - Deno Deploy version (clean rewrite)
// Web Crypto API for auth, Deno KV for storage (with in-memory fallback)

const PORT = Deno.env.get("PORT") || 3000;
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "nova-jwt-CHANGE-2026";

const CARD_NUMBER = '4441 1144 3770 6334';
const TELEGRAM = 'I1xD0';
const CLIENT_VERSION = '0.1.0';
const PAYMENT_PROVIDER = 'crypto';
const USDT_WALLET = 'TGRKziHYYbmvQ3JV5uMZqAjrrucAJHTMpv';
const USDT_NETWORK = 'TRC20 (Tron)';
const USD_RATES = { UAH: 41, RUB: 100, KZT: 500 };
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Nova Client <onboarding@resend.dev>";

const PLANS = [
  { id: 'month',     name: '1 \u043C\u0435\u0441\u044F\u0446',             priceUah: 50,  priceRub: 100, priceKzt: 575,  days: 30,  lifetime: false },
  { id: '3months',   name: '3 \u043C\u0435\u0441\u044F\u0446\u0430',       priceUah: 100, priceRub: 200, priceKzt: 1150, days: 90,  lifetime: false },
  { id: 'halfyear',  name: '6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432', priceUah: 150, priceRub: 300, priceKzt: 1725, days: 180, lifetime: false },
  { id: 'year',      name: '365 \u0434\u043D\u0435\u0439',                 priceUah: 200, priceRub: 400, priceKzt: 2300, days: 365, lifetime: false },
  { id: 'beta',       name: 'Beta (\u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430)',   priceUah: 100, priceRub: 200, priceKzt: 1150, days: 0,   lifetime: true  },
  { id: 'lifetime',  name: '\u041D\u0430\u0432\u0441\u0435\u0433\u0434\u0430 (Life)', priceUah: 300, priceRub: 550, priceKzt: 3450, days: 0,   lifetime: true  }
];
const PROMOS = { 'Release': { discountPercent: 50, description: 'Релиз — скидка 50%' } };

// ===== KV (with fallback) =====
let kv = null;
try { kv = await Deno.openKv(); } catch (e) { console.log('KV fallback to memory'); }
const mem = { users: [], orders: [], counter: 1 };
async function getK(key, def) { if (kv) { const r = await kv.get([key]); return r.value ?? def; } return mem[key] ?? def; }
async function setK(key, val) { if (kv) { await kv.set([key], val); return; } mem[key] = val; }

// ===== CRYPTO =====
async function hashPwd(pwd) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const combined = new Uint8Array(salt.length + hash.byteLength);
  combined.set(salt, 0); combined.set(new Uint8Array(hash), salt.length);
  return btoa(String.fromCharCode(...combined));
}
async function verifyPwd(pwd, stored) {
  try {
    const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16), orig = combined.slice(16);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    if (hash.byteLength !== orig.length) return false;
    const h = new Uint8Array(hash);
    for (let i = 0; i < h.length; i++) if (h[i] !== orig[i]) return false;
    return true;
  } catch { return false; }
}
async function makeJwt(payload) {
  const enc = new TextEncoder();
  const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
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
    const valid = await crypto.subtle.verify('HMAC', key, enc.encode(data), Uint8Array.from(atob(s), c => c.charCodeAt(0)));
    if (!valid) return null;
    const payload = JSON.parse(atob(p));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function publicUser(u) { return { id: u.id, username: u.username, email: u.email || null, role: u.role, license: u.license, balance: u.balance, createdAt: u.createdAt, hwid: u.hwid || null }; }
function licenseValid(u) { if (!u.license || !u.license.active) return false; if (u.license.type === 'lifetime') return true; return u.license.expiresAt && u.license.expiresAt > Date.now(); }

// ===== EMAIL (Resend API) =====
async function sendVerificationEmail(toEmail, code, username) {
  if (!RESEND_API_KEY) { console.log('No RESEND_API_KEY, skipping email. Code:', code); return false; }
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0E0818;font-family:Segoe UI,sans-serif">
<div style="max-width:480px;margin:20px auto;background:#1C1430;border-radius:16px;padding:32px;border:1px solid #3D2459">
<div style="text-align:center;margin-bottom:24px"><span style="font-size:28px;font-weight:800;background:linear-gradient(90deg,#FF8FC7,#C45BFF);-webkit-background-clip:text;color:transparent">Nova Client</span></div>
<h1 style="color:#E8D8F5;font-size:22px;margin:0 0 16px">Подтвердите email</h1>
<p style="color:#8E72B0;font-size:15px;line-height:1.6">Привет, <b style="color:#FF8FC7">${username}</b>! Ваш код подтверждения:</p>
<div style="text-align:center;margin:28px 0"><span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#C45BFF;background:#2E1A48;padding:16px 32px;border-radius:12px">${code}</span></div>
<p style="color:#8E72B0;font-size:13px">Если вы не регистрировались — проигнорируйте это письмо.</p>
<hr style="border:none;border-top:1px solid #3D2459;margin:24px 0">
<p style="color:#6B4D7A;font-size:11px;text-align:center">© 2026 Nova Client · Fabric 1.21.4</p>
</div></body></html>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [toEmail], subject: "Nova Client — код подтверждения", html })
    });
    const data = await res.json();
    if (!res.ok) { console.log('Resend error:', JSON.stringify(data)); return false; }
    console.log('Email sent to', toEmail);
    return true;
  } catch (e) { console.log('Email send failed:', e.message); return false; }
}

async function seedOwner() {
  try {
    const users = await getK('users', []);
    if (!users.find(u => u.username.toLowerCase() === 'n1x')) {
      users.push({ id: 1, username: 'N1x', passwordHash: await hashPwd('samturail'), role: 'owner', hwid: null, license: { type: 'lifetime', expiresAt: null, active: true }, balance: 0, createdAt: Date.now() });
      await setK('users', users); await setK('counter', 2);
      console.log('Owner N1x created');
    }
  } catch (e) { console.log('seed err:', e.message); }
}
await seedOwner();

// ===== SERVER =====
const serve = async (req) => {
  const url = new URL(req.url);
  let path = url.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const method = req.method;
  console.log(`[REQ] ${method} ${path}`);

  const json = async () => { try { return JSON.parse(await req.text()); } catch { return {}; } };
  const sendJson = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  const authHeader = req.headers.get('authorization') || '';
  let authUser = null;
  if (authHeader.startsWith('Bearer ')) authUser = await verifyJwt(authHeader.replace('Bearer ', ''));
  const adminOnly = () => authUser && (authUser.role === 'owner' || authUser.role === 'admin');

  // ===== API ROUTES (all /api/* handled here, never static) =====
  if (path.startsWith('/api/')) {
    if (path === '/api/plans' && method === 'GET') return sendJson(PLANS);
    if (path === '/api/config' && method === 'GET') return sendJson({ telegram: TELEGRAM, cardNumber: CARD_NUMBER, plans: PLANS, paymentProvider: PAYMENT_PROVIDER, usdtWallet: USDT_WALLET, usdtNetwork: USDT_NETWORK, usdRates: USD_RATES, clientVersion: CLIENT_VERSION });
    if (path === '/api/debug' && method === 'GET') return sendJson({ path, method, ok: true });

    if (path === '/api/register' && method === 'POST') {
      const { username, password, email } = await json();
      if (!username || !password || !email) return sendJson({ error: 'Заполните все поля' }, 400);
      if (username.length < 3) return sendJson({ error: 'Логин минимум 3 символа' }, 400);
      if (password.length < 4) return sendJson({ error: 'Пароль минимум 4 символа' }, 400);
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return sendJson({ error: 'Неверный email' }, 400);
      const users = await getK('users', []);
      if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) return sendJson({ error: 'Логин занят' }, 409);
      if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) return sendJson({ error: 'Email уже используется' }, 409);
      const id = await getK('counter', 1);
      const verifyCode = String(Math.floor(100000 + Math.random() * 900000));
      const u = { id, username, passwordHash: await hashPwd(password), email, verified: false, verifyCode, role: 'user', hwid: null, license: { type: null, expiresAt: null, active: false }, balance: 0, createdAt: Date.now() };
      users.push(u);
      await setK('users', users); await setK('counter', id + 1);
      const emailSent = await sendVerificationEmail(email, verifyCode, username);
      return sendJson({ token: await makeJwt({ id, username, role: 'user' }), user: publicUser(u), needVerify: true, emailSent });
    }
    if (path === '/api/verify' && method === 'POST') {
      const { code } = await json();
      if (!authUser || !code) return sendJson({ error: 'Нужен код' }, 400);
      const users = await getK('users', []);
      const u = users.find(x => x.id === authUser.id);
      if (!u) return sendJson({ error: 'Не найден' }, 404);
      if (u.verified) return sendJson({ error: 'Уже подтверждён' }, 400);
      if (u.verifyCode !== code) return sendJson({ error: 'Неверный код' }, 400);
      u.verified = true;
      await setK('users', users);
      return sendJson({ token: await makeJwt({ id: u.id, username: u.username, role: u.role }), user: publicUser(u), verified: true });
    }
    if (path === '/api/resend' && method === 'POST') {
      if (!authUser) return sendJson({ error: 'Нет токена' }, 401);
      const users = await getK('users', []);
      const u = users.find(x => x.id === authUser.id);
      if (!u || u.verified) return sendJson({ error: 'Не найден или уже подтверждён' }, 400);
      const emailSent = await sendVerificationEmail(u.email, u.verifyCode, u.username);
      return sendJson({ emailSent });
    }
    if (path === '/api/login' && method === 'POST') {
      const { username, password } = await json();
      const users = await getK('users', []);
      const u = users.find(x => x.username.toLowerCase() === (username || '').toLowerCase());
      if (!u || !(await verifyPwd(password || '', u.passwordHash))) return sendJson({ error: 'Неверный логин или пароль' }, 401);
      if (!u.verified) {
        const emailSent = await sendVerificationEmail(u.email, u.verifyCode, u.username);
        return sendJson({ error: 'Email не подтверждён. Код отправлен на почту.', needVerify: true, emailSent }, 403);
      }
      return sendJson({ token: await makeJwt({ id: u.id, username: u.username, role: u.role }), user: publicUser(u) });
    }
    if (path === '/api/me' && method === 'GET') {
      if (!authUser) return sendJson({ error: 'Не найден' }, 404);
      const users = await getK('users', []);
      const u = users.find(x => x.id === authUser.id);
      return u ? sendJson(publicUser(u)) : sendJson({ error: 'Не найден' }, 404);
    }
    if (path === '/api/promo/validate' && method === 'POST') {
      const { code, planId } = await json();
      const promo = PROMOS[(code || '').trim()];
      if (!promo) return sendJson({ error: 'Промокод не найден' }, 404);
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) return sendJson({ error: 'Тариф не найден' }, 400);
      return sendJson({ code, discountPercent: promo.discountPercent, description: promo.description, discountedUah: +(plan.priceUah * (1 - promo.discountPercent / 100)).toFixed(2) });
    }
    if (path === '/api/order' && method === 'POST') {
      if (!authUser) return sendJson({ error: 'Нет токена' }, 401);
      const { planId, promoCode } = await json();
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) return sendJson({ error: 'Тариф не найден' }, 400);
      let amount = plan.priceUah, discount = 0;
      if (promoCode) { const promo = PROMOS[promoCode.trim()]; if (promo) { discount = promo.discountPercent; amount = +(plan.priceUah * (1 - discount / 100)).toFixed(2); } }
      const orders = await getK('orders', []);
      const id = await getK('counter', 1);
      orders.push({ id, userId: authUser.id, planId, planName: plan.name, amount, discountPercent: discount, promoCode: promoCode || null, currency: 'UAH', cardNumber: CARD_NUMBER, telegram: TELEGRAM, status: 'pending_payment', createdAt: Date.now() });
      await setK('orders', orders); await setK('counter', id + 1);
      return sendJson(orders[orders.length - 1]);
    }
    if (path === '/api/orders' && method === 'GET') {
      if (!authUser) return sendJson({ error: 'Нет токена' }, 401);
      const orders = await getK('orders', []);
      return sendJson(orders.filter(o => o.userId === authUser.id));
    }
    if (path === '/api/admin/orders' && method === 'GET') {
      if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
      return sendJson(await getK('orders', []));
    }
    if (path.startsWith('/api/admin/order/') && path.endsWith('/approve') && method === 'POST') {
      if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
      const id = Number(path.split('/')[3]);
      const orders = await getK('orders', []); const o = orders.find(x => x.id === id);
      if (!o) return sendJson({ error: 'Заказ не найден' }, 404);
      const users = await getK('users', []); const u = users.find(x => x.id === o.userId);
      if (!u) return sendJson({ error: 'Юзер не найден' }, 404);
      const plan = PLANS.find(p => p.id === o.planId);
      if (plan.lifetime) u.license = { type: 'lifetime', expiresAt: null, active: true };
      else { const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now(); u.license = { type: plan.id, expiresAt: base + plan.days * 86400000, active: true }; }
      o.status = 'approved'; o.approvedAt = Date.now();
      await setK('orders', orders); await setK('users', users);
      return sendJson({ order: o, user: publicUser(u) });
    }
    if (path.startsWith('/api/admin/order/') && path.endsWith('/reject') && method === 'POST') {
      if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
      const id = Number(path.split('/')[3]);
      const orders = await getK('orders', []); const o = orders.find(x => x.id === id);
      if (!o) return sendJson({ error: 'Заказ не найден' }, 404);
      o.status = 'rejected'; await setK('orders', orders);
      return sendJson(o);
    }
    if (path === '/api/admin/users' && method === 'GET') {
      if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
      return sendJson((await getK('users', [])).map(publicUser));
    }
    if (path.startsWith('/api/admin/user/') && path.endsWith('/grant') && method === 'POST') {
      if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
      const id = Number(path.split('/')[3]); const { planId } = await json();
      const users = await getK('users', []); const u = users.find(x => x.id === id);
      if (!u) return sendJson({ error: 'Не найден' }, 404);
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) return sendJson({ error: 'Тариф не найден' }, 400);
      if (plan.lifetime) u.license = { type: 'lifetime', expiresAt: null, active: true };
      else { const base = (u.license && u.license.expiresAt && u.license.expiresAt > Date.now()) ? u.license.expiresAt : Date.now(); u.license = { type: plan.id, expiresAt: base + plan.days * 86400000, active: true }; }
      await setK('users', users); return sendJson(publicUser(u));
    }
    if (path.startsWith('/api/admin/user/') && path.endsWith('/revoke') && method === 'POST') {
      if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
      const id = Number(path.split('/')[3]);
      const users = await getK('users', []); const u = users.find(x => x.id === id);
      if (!u) return sendJson({ error: 'Не найден' }, 404);
      u.license = { type: null, expiresAt: null, active: false };
      await setK('users', users); return sendJson(publicUser(u));
    }
    if (path.startsWith('/api/admin/user/') && path.endsWith('/reset-hwid') && method === 'POST') {
      if (!adminOnly()) return sendJson({ error: 'Только админ' }, 403);
      const id = Number(path.split('/')[3]);
      const users = await getK('users', []); const u = users.find(x => x.id === id);
      if (!u) return sendJson({ error: 'Не найден' }, 404);
      u.hwid = null; await setK('users', users); return sendJson(publicUser(u));
    }
    if (path === '/api/launcher/auth' && method === 'POST') {
      const { username, password, hwid } = await json();
      const users = await getK('users', []);
      const u = users.find(x => x.username.toLowerCase() === (username || '').toLowerCase());
      if (!u || !(await verifyPwd(password || '', u.passwordHash))) return sendJson({ error: 'Неверный логин или пароль' }, 401);
      if (!hwid) return sendJson({ error: 'HWID не передан' }, 400);
      if (!u.hwid) { u.hwid = hwid; await setK('users', users); }
      else if (u.hwid !== hwid) return sendJson({ error: 'Другой HWID. Обратитесь к администрации.' }, 403);
      return sendJson({ token: await makeJwt({ id: u.id, username: u.username, role: u.role }), user: publicUser(u), licenseValid: licenseValid(u), license: u.license, cardNumber: CARD_NUMBER });
    }
    if (path === '/api/launcher/validate' && method === 'GET') {
      if (!authUser) return sendJson({ valid: false }, 404);
      const users = await getK('users', []); const u = users.find(x => x.id === authUser.id);
      return u ? sendJson({ valid: licenseValid(u), license: u.license, user: publicUser(u) }) : sendJson({ valid: false }, 404);
    }
    if (path === '/api/client/version' && method === 'GET') return sendJson({ version: CLIENT_VERSION });
    if (path === '/api/client/download' && method === 'GET') {
      try { return new Response(await Deno.readFile('downloads/nova-client.jar'), { headers: { 'Content-Type': 'application/java-archive', 'Content-Disposition': 'attachment; filename="nova-client.jar"' } }); }
      catch { return sendJson({ error: 'Jar не найдена' }, 404); }
    }
    return sendJson({ error: 'API not found' }, 404);
  }

  // ===== STATIC FILES (server handles everything) =====
  if (method === 'GET') {
    const filePath = 'Public' + (path === '/' ? '/index.html' : path);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
    try {
      const data = await Deno.readFile(filePath);
      const ext = filePath.substring(filePath.lastIndexOf('.'));
      return new Response(data, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
    } catch {}
  }

  return sendJson({ error: 'Not found' }, 404);
};

console.log(`Nova Web (Deno): http://localhost:${PORT}`);
Deno.serve({ port: Number(PORT), hostname: '0.0.0.0' }, serve);
