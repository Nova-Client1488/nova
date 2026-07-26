const API = '';
let token = localStorage.getItem('nova_token');
let me = null;

const app = document.getElementById('app');
const navAuth = document.getElementById('nav-auth');

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw data;
  return data;
}

function saveAuth(t, u) { token = t; me = u; localStorage.setItem('nova_token', t); renderNav(); }
function logout() { token = null; me = null; localStorage.removeItem('nova_token'); renderNav(); location.hash = '#/login'; }

function renderNav() {
  if (token) {
    navAuth.innerHTML = `<a href="#/dashboard" style="color:#fff;font-weight:700">${me ? me.username : '\u041A\u0430\u0431\u0438\u043D\u0435\u0442'}</a> <a class="btn btn-ghost" style="padding:8px 16px" id="logout-btn">\u0412\u044B\u0439\u0442\u0438</a>`;
    document.getElementById('logout-btn').onclick = logout;
  } else {
    navAuth.innerHTML = `<a href="#/login" class="btn btn-pink" style="padding:8px 18px">\u0412\u043E\u0439\u0442\u0438</a>`;
  }
}

async function refreshMe() {
  if (!token) return null;
  try { me = await api('/api/me'); renderNav(); return me; }
  catch { logout(); return null; }
}

function alertBox(msg, type = 'err') {
  return `<div class="alert alert-${type}">${msg}</div>`;
}

const routes = {
  '/': homePage,
  '/pricing': pricingPage,
  '/purchase': purchasePage,
  '/login': authPage,
  '/register': () => authPage(true),
  '/dashboard': dashboardPage,
  '/checkout': checkoutPage,
  '/admin': adminPage
};

async function router() {
  try {
    const raw = location.hash.replace('#', '') || '/';
    const path = raw.split('?')[0];
    const route = routes[path] || homePage;
    window.scrollTo(0, 0);
    document.querySelectorAll('.nav-links a[data-route]').forEach(a => {
      a.style.color = a.getAttribute('data-route') === path ? '#fff' : '';
    });
    if ((path === '/dashboard' || path === '/checkout' || path === '/admin') && !token) { location.hash = '#/login'; return; }
    if (path === '/admin' && me && me.role !== 'owner' && me.role !== 'admin') { app.innerHTML = '<div class="auth-wrap"><div class="auth-card"><h2>\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D</h2><p class="sub">\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438</p></div></div>'; return; }
    await route();
  } catch (e) {
    app.innerHTML = '<div class="auth-wrap"><div class="auth-card"><h2>\u041E\u0448\u0438\u0431\u043A\u0430</h2><p class="sub">' + (e && e.message ? e.message : '\u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435') + '</p></div></div>';
  }
}

function homePage() {
  app.innerHTML = `
    <div class="hero">
      <h1>NOVA CLIENT</h1>
      <p>\u041F\u0440\u0435\u043C\u0438\u0443\u043C \u043A\u043B\u0438\u0435\u043D\u0442 \u0434\u043B\u044F Minecraft Fabric 1.21.4. KillAura, AutoSwap, \u0432\u0438\u0437\u0443\u0430\u043B\u044B \u0438 \u0443\u0434\u043E\u0431\u043D\u044B\u0439 \u043B\u0430\u0443\u043D\u0447\u0435\u0440.</p>
      <div class="hero-btns">
        <a href="#/pricing" class="btn btn-pink">\u041A\u0443\u043F\u0438\u0442\u044C</a>
        <a href="#/login" class="btn btn-ghost">\u0412\u043E\u0439\u0442\u0438</a>
      </div>
    </div>
    <div class="features">
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6 3 3-6 6-3-3z"/></svg></div><h3>Combat \u043C\u043E\u0434\u0443\u043B\u0438</h3><p>KillAura \u0441 \u0443\u043C\u043D\u044B\u043C\u0438 \u0440\u043E\u0442\u0430\u0446\u0438\u044F\u043C\u0438, AutoSwap, Criticals.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C45BFF" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/></svg></div><h3>\u0412\u0438\u0437\u0443\u0430\u043B\u044B</h3><p>ESP, Chams, Skeleton, TargetESP, FullBright \u0438 HUD.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg></div><h3>\u041B\u0430\u0443\u043D\u0447\u0435\u0440</h3><p>\u0421\u0432\u043E\u0439 \u043B\u0430\u0443\u043D\u0447\u0435\u0440 \u0441 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0435\u0439, \u0432\u044B\u0431\u043E\u0440\u043E\u043C RAM \u0438 \u0430\u0432\u0442\u043E\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435\u043C.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C45BFF" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3>\u0411\u0430\u0439\u043F\u0430\u0441\u044B</h3><p>\u0410\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u044F \u043F\u043E\u0434 \u0430\u043D\u0442\u0438\u0447\u0438\u0442\u044B: Funtime, Grim, SpookyTime.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div><h3>\u041E\u0431\u043B\u0430\u0447\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u0438\u0433\u0438</h3><p>\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043C\u0435\u0436\u0434\u0443 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430\u043C\u0438.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C45BFF" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><h3>\u0422\u0435\u043C\u044B</h3><p>\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F \u0438 \u043A\u0430\u0441\u0442\u043E\u043C\u043D\u044B\u0439 UI.</p></div>
    </div>`;
}

function pricingPage() {
  app.innerHTML = `
    <div class="hero" style="padding-top:20px">
      <h1 style="font-size:48px">\u0422\u0430\u0440\u0438\u0444\u044B</h1>
      <p>\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0439 \u043F\u043B\u0430\u043D.</p>
    </div>
    <div class="pricing" id="plans"></div>`;
  fetch('/api/plans').then(r => r.json()).then(plans => {
    document.getElementById('plans').innerHTML = plans.map(p => {
      const pop = p.id === 'halfyear' ? 'popular' : '';
      const badge = p.id === 'halfyear' ? '<div class="badge">\u0425\u0418\u0422</div>' : '';
      const feat = p.lifetime
        ? ['\u0412\u0441\u0435 \u043C\u043E\u0434\u0443\u043B\u0438 \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430', '\u0412\u0441\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F', '\u041E\u0431\u043B\u0430\u0447\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u0438\u0433\u0438', '\u041B\u0430\u0443\u043D\u0447\u0435\u0440 + \u0441\u0430\u0439\u0442', '\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u043D\u0430\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430']
        : ['\u0412\u0441\u0435 \u043C\u043E\u0434\u0443\u043B\u0438', '\u041E\u0431\u043B\u0430\u0447\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u0438\u0433\u0438', '\u041B\u0430\u0443\u043D\u0447\u0435\u0440 + \u0441\u0430\u0439\u0442', '\u0421\u0440\u043E\u043A: ' + p.name, '\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430'];
      return `<div class="plan ${pop}">${badge}<h3>${p.name}</h3><div class="dur">${p.lifetime ? '\u0431\u0435\u0437\u043B\u0438\u043C\u0438\u0442' : '\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430'}</div>
        <div class="price">${p.priceUah}<span class="cur"> \u0433\u0440\u043D</span></div>
        <div class="kzt">\u0438\u043B\u0438 ${p.priceRub} \u20BD \u00B7 \u2248 ${p.priceKzt} \u20B8</div>
        <ul>${feat.map(f => `<li>${f}</li>`).join('')}</ul>
        <a href="#/purchase?plan=${p.id}" class="btn btn-green btn-block">\u041A\u0443\u043F\u0438\u0442\u044C ${p.name}</a></div>`;
    }).join('');
  });
}

async function purchasePage() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const planId = params.get('plan') || 'month';
  const cfg = await fetch('/api/config').then(r => r.json());
  const plan = cfg.plans.find(p => p.id === planId) || cfg.plans[0];
  const pricesLine = `${plan.priceUah} \u0433\u0440\u043D \u00B7 ${plan.priceRub} \u20BD \u00B7 ${plan.priceKzt} \u20B8`;
  const usdtEst = (plan.priceUah / cfg.usdRates.UAH).toFixed(2);
  app.innerHTML = `
    <div style="max-width:880px;margin:0 auto">
      <h1 style="font-size:34px;margin-bottom:6px">\u041F\u043E\u043A\u0443\u043F\u043A\u0430 Nova Client</h1>
      <p style="color:#888;margin-bottom:8px">\u0422\u0430\u0440\u0438\u0444: <b style="color:#fff">${plan.name}</b> \u00B7 ${pricesLine} \u00B7 \u2248${usdtEst} USDT</p>
      <p style="color:#888;margin-bottom:28px">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043F\u043E\u0441\u043E\u0431 \u043E\u043F\u043B\u0430\u0442\u044B</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px">
        <div class="plan" style="cursor:pointer" id="opt-card2card">
          <div style="font-size:34px;margin-bottom:10px"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
          <h3 style="font-size:18px;margin-bottom:8px">\u041A\u0430\u0440\u0442\u043E\u0439 (\u0423\u043A\u0440\u0430\u0438\u043D\u0430)</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">\u041F\u0435\u0440\u0435\u0432\u043E\u0434 \u043D\u0430 \u043A\u0430\u0440\u0442\u0443 Mono (\u0433\u0440\u0438\u0432\u043D\u044B). \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0432 Telegram.</p>
          <span class="btn btn-green btn-block">\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C \u2192</span>
        </div>
        <div class="plan popular" style="cursor:pointer" id="opt-crypto">
          <div class="badge">\u041A\u0440\u0438\u043F\u0442\u0430</div>
          <div style="font-size:34px;margin-bottom:10px"><svg width="34" height="34" viewBox="0 0 24 24" fill="#C45BFF"><circle cx="12" cy="12" r="10" fill="none" stroke="#C45BFF" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#C45BFF">$</text></svg></div>
          <h3 style="font-size:18px;margin-bottom:8px">USDT (TRC20)</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">\u0410\u0432\u0442\u043E\u043A\u043E\u043D\u0432\u0435\u0440\u0442\u0430\u0446\u0438\u044F \u20B4/\u20BD/\u20B8 \u2192 USDT. \u0411\u0435\u0437 \u043F\u0430\u0441\u043F\u043E\u0440\u0442\u0430.</p>
          <span class="btn btn-green btn-block">\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C USDT \u2192</span>
        </div>
        <div class="plan" style="cursor:pointer" id="opt-reseller">
          <div style="font-size:34px;margin-bottom:10px"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
          <h3 style="font-size:18px;margin-bottom:8px">\u0427\u0435\u0440\u0435\u0437 \u0440\u0435\u0441\u0435\u043B\u043B\u0435\u0440\u0430</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">\u041E\u043F\u043B\u0430\u0442\u0430 \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u0432 Telegram @${cfg.telegram}. \u041B\u044E\u0431\u0430\u044F \u0432\u0430\u043B\u044E\u0442\u0430.</p>
          <span class="btn btn-pink btn-block">\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0432 Telegram \u2192</span>
        </div>
      </div>
    </div>`;
  document.getElementById('opt-card2card').onclick = () => location.hash = '#/checkout?plan=' + plan.id + '&method=card2card';
  document.getElementById('opt-crypto').onclick = () => location.hash = '#/checkout?plan=' + plan.id + '&method=crypto';
  document.getElementById('opt-reseller').onclick = () => {
    const msg = `\u{1F6D2} \u0417\u0430\u043A\u0430\u0437 Nova Client\n\u0422\u0430\u0440\u0438\u0444: ${plan.name}\n\u0426\u0435\u043D\u0430: ${pricesLine}\n\u0425\u043E\u0447\u0443 \u043A\u0443\u043F\u0438\u0442\u044C \u0447\u0435\u0440\u0435\u0437 \u0440\u0435\u0441\u0435\u043B\u043B\u0435\u0440\u0430`;
    window.open(`https://t.me/${cfg.telegram}?text=${encodeURIComponent(msg)}`, '_blank');
  };
}

function authPage(isRegister) {
  const title = isRegister ? '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F' : '\u0412\u0445\u043E\u0434';
  const sub = isRegister ? '\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 Nova Client' : '\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442';
  const switchTxt = isRegister ? '\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442? <a id="sw">\u0412\u043E\u0439\u0442\u0438</a>' : '\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430? <a id="sw">\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F</a>';
  const emailField = isRegister ? '<div class="field"><label>Email</label><input id="u-email" type="email" placeholder="\u0412\u0430\u0448 email"></div>' : '';
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h2>${title}</h2><p class="sub">${sub}</p>
    <div id="auth-alert"></div>
    <div class="field"><label>\u041B\u043E\u0433\u0438\u043D</label><input id="u-username" placeholder="\u0412\u0430\u0448 \u043B\u043E\u0433\u0438\u043D"></div>
    ${emailField}
    <div class="field"><label>\u041F\u0430\u0440\u043E\u043B\u044C</label><input id="u-password" type="password" placeholder="\u0412\u0430\u0448 \u043F\u0430\u0440\u043E\u043B\u044C"></div>
    <button class="btn btn-pink btn-block" id="auth-submit">${title}</button>
    <div class="auth-switch">${switchTxt}</div>
  </div></div>`;
  document.getElementById('sw').onclick = () => location.hash = isRegister ? '#/login' : '#/register';
  document.getElementById('auth-submit').onclick = async () => {
    const username = document.getElementById('u-username').value.trim();
    const password = document.getElementById('u-password').value;
    const email = isRegister ? document.getElementById('u-email').value.trim() : '';
    const box = document.getElementById('auth-alert');
    try {
      const data = await api('/api/' + (isRegister ? 'register' : 'login'), {
        method: 'POST', body: JSON.stringify({ username, password, email })
      });
      if (data.needVerify) { verifyPage(null, data.token, data.user, data.emailSent); return; }
      saveAuth(data.token, data.user);
      box.innerHTML = alertBox('\u0423\u0441\u043F\u0435\u0448\u043D\u043E! \u041F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435...', 'ok');
      setTimeout(() => location.hash = '#/dashboard', 600);
    } catch (e) {
      if (e.needVerify) { verifyPage(null, e.token, null, e.emailSent); return; }
      box.innerHTML = alertBox(e.error || '\u041E\u0448\u0438\u0431\u043A\u0430');
    }
  };
  document.getElementById('u-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-submit').click(); });
}

function verifyPage(sentCode, tempToken, tempUser, emailSent) {
  const hint = emailSent === false ? '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043F\u0438\u0441\u044C\u043C\u043E. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.' : '\u041A\u043E\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u0432\u0430\u0448\u0443 \u043F\u043E\u0447\u0442\u0443';
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h2>\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 email</h2><p class="sub">${hint}</p>
    <div id="verify-alert"></div>
    <div class="field"><label>\u041A\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F</label><input id="u-code" placeholder="6-\u0437\u043D\u0430\u0447\u043D\u044B\u0439 \u043A\u043E\u0434"></div>
    <button class="btn btn-pink btn-block" id="verify-submit">\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C</button>
    <div class="auth-switch"><a id="resend-code">\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u0434 \u0441\u043D\u043E\u0432\u0430</a></div>
  </div></div>`;
  if (tempToken) localStorage.setItem('nova_token', tempToken);
  document.getElementById('verify-submit').onclick = async () => {
    const code = document.getElementById('u-code').value.trim();
    const box = document.getElementById('verify-alert');
    try {
      const data = await api('/api/verify', { method: 'POST', body: JSON.stringify({ code }) });
      saveAuth(data.token, data.user);
      box.innerHTML = alertBox('Email \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D! \u041F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435...', 'ok');
      setTimeout(() => location.hash = '#/dashboard', 600);
    } catch (e) {
      box.innerHTML = alertBox(e.error || '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043E\u0434');
    }
  };
  const resend = document.getElementById('resend-code');
  if (resend) resend.onclick = async () => { try { await api('/api/resend', { method: 'POST' }); } catch {} };
}

async function dashboardPage() {
  await refreshMe();
  if (!me) return;
  const lic = me.license;
  let status, statusClass, meta;
  if (lic && lic.active) {
    if (lic.type === 'lifetime') { status = '\u0410\u043A\u0442\u0438\u0432\u043D\u0430 (Navsegda)'; statusClass = 'active'; meta = '\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F'; }
    else if (lic.expiresAt > Date.now()) {
      const days = Math.ceil((lic.expiresAt - Date.now()) / 86400000);
      status = '\u0410\u043A\u0442\u0438\u0432\u043D\u0430'; statusClass = 'active'; meta = `\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: ${days} \u0434\u043D. \u00B7 \u0434\u043E ${new Date(lic.expiresAt).toLocaleDateString('ru-RU')}`;
    } else { status = '\u0418\u0441\u0442\u0435\u043A\u043B\u0430'; statusClass = 'inactive'; meta = '\u041A\u0443\u043F\u0438\u0442\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443'; }
  } else { status = '\u041D\u0435\u0442 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438'; statusClass = 'inactive'; meta = '\u041A\u0443\u043F\u0438\u0442\u0435 \u0442\u0430\u0440\u0438\u0444'; }
  const roleTag = me.role === 'owner' ? '<span class="tag tag-owner">Owner</span>' : me.role === 'admin' ? '<span class="tag tag-admin">Admin</span>' : '<span class="tag tag-user">User</span>';
  app.innerHTML = `<div class="dash">
    <h1>\u041F\u0440\u0438\u0432\u0435\u0442, ${me.username} ${roleTag}</h1>
    <div class="dash-grid">
      <div class="dcard"><h3>\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F</h3><div class="big ${statusClass}">${status}</div><div class="meta">${meta}</div></div>
      <div class="dcard"><h3>\u0410\u043A\u043A\u0430\u0443\u043D\u0442</h3><div class="big" style="font-size:20px">${me.username}</div><div class="meta">\u0420\u043E\u043B\u044C: ${me.role} \u00B7 ID: ${me.id}</div></div>
    </div>
    <div class="dcard">
      <h3>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px">
        <a href="#/pricing" class="btn btn-pink">\u041A\u0443\u043F\u0438\u0442\u044C / \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C</a>
        <a href="/api/client/download" class="btn btn-green">\u2B07 \u0421\u043A\u0430\u0447\u0430\u0442\u044C \u043B\u0430\u0443\u043D\u0447\u0435\u0440</a>
        <a href="/api/client/jar" class="btn btn-ghost" style="font-size:13px">\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u043C\u043E\u0434 (.jar)</a>\u0442\u044C \u043B\u0430\u0443\u043D\u0447\u0435\u0440</a>
        ${me.role === 'owner' || me.role === 'admin' ? '<a href="#/admin" class="btn btn-ghost">\u0410\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C</a>' : ''}
      </div>
    </div>
    <div class="dcard" style="margin-top:18px"><h3>\u041C\u043E\u0438 \u0437\u0430\u043A\u0430\u0437\u044B</h3><div id="my-orders" style="margin-top:10px"></div></div>
  </div>`;
  loadMyOrders();
}

async function loadMyOrders() {
  try {
    const orders = await api('/api/orders');
    const el = document.getElementById('my-orders');
    if (!orders.length) { el.innerHTML = '<p style="color:#666;font-size:14px">\u0417\u0430\u043A\u0430\u0437\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>\u0422\u0430\u0440\u0438\u0444</th><th>\u0421\u0443\u043C\u043C\u0430</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th><th>\u0414\u0430\u0442\u0430</th></tr></thead><tbody>${orders.map(o => {
      const tag = `<span class="tag tag-${o.status.replace('_','')}">${({pending_payment:'\u041E\u0436\u0438\u0434\u0430\u0435\u0442',waiting_approval:'\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435',approved:'\u0410\u043A\u0442\u0438\u0432\u043D\u0430',rejected:'\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430'})[o.status]}</span>`;
      return `<tr><td>${o.planName}</td><td>${o.amount} ${o.currency}</td><td>${tag}</td><td>${new Date(o.createdAt).toLocaleDateString('ru-RU')}</td></tr>`;
    }).join('')}</tbody></table>`;
  } catch {}
}

async function checkoutPage() {
  await refreshMe();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  let planId = params.get('plan') || 'month';
  const method = params.get('method') || 'reseller';
  let promoCode = '';
  let currency = 'UAH';
  const cfg = await fetch('/api/config').then(r => r.json());
  const plans = cfg.plans;
  const plan = plans.find(p => p.id === planId) || plans[0];
  const curLabel = c => c === 'RUB' ? '\u20BD' : c === 'KZT' ? '\u20B8' : '\u0433\u0440\u043D';
  const basePrice = (pid, cur) => { const p = plans.find(x => x.id === pid); return cur === 'RUB' ? p.priceRub : cur === 'KZT' ? p.priceKzt : p.priceUah; };
  const fmt = (val, cur) => cur === 'KZT' ? Math.round(val) + ' \u20B8' : val + ' ' + curLabel(cur);
  let discountPercent = 0;
  const getFinalPrice = (pid, cur) => { const base = basePrice(pid, cur); return discountPercent > 0 ? +(base * (1 - discountPercent / 100)).toFixed(2) : base; };

  app.innerHTML = `<div class="checkout">
    <h1 style="font-size:28px;margin-bottom:6px">${method === 'card2card' ? '\u041F\u0435\u0440\u0435\u0432\u043E\u0434 \u043D\u0430 \u043A\u0430\u0440\u0442\u0443 (Mono)' : method === 'crypto' ? '\u041E\u043F\u043B\u0430\u0442\u0430 USDT' : '\u041E\u043F\u043B\u0430\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 \u0440\u0435\u0441\u0435\u043B\u043B\u0435\u0440\u0430'}</h1>
    <p style="color:#888;margin-bottom:20px">\u0422\u0430\u0440\u0438\u0444: <b style="color:#fff">${plan.name}</b></p>
    <div class="co-step"><h3>1. \u0422\u0430\u0440\u0438\u0444</h3>
      <select id="plan-select" style="width:100%;padding:12px;border-radius:10px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:15px">
        ${plans.map(p => `<option value="${p.id}" ${p.id===planId?'selected':''}>${p.name} \u2014 ${p.priceUah} \u0433\u0440\u043D / ${p.priceRub} \u20BD</option>`).join('')}
      </select>
    </div>
    <div class="co-step"><h3>2. \u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434</h3>
      <div style="display:flex;gap:10px">
        <input id="promo-input" placeholder="\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434" style="flex:1;padding:12px 16px;border-radius:10px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:15px;outline:none">
        <button class="btn btn-ghost" id="promo-apply">\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C</button>
      </div>
      <div id="promo-msg" style="margin-top:10px;font-size:14px"></div>
    </div>
    <div class="co-step"><h3>3. \u0412\u0430\u043B\u044E\u0442\u0430</h3>
      <div class="pay-row" style="flex-wrap:wrap">
        <div class="pay-opt active" data-cur="UAH">\u{1F1FA}\u{1F1E6} \u0413\u0440\u0438\u0432\u043D\u044B</div>
        <div class="pay-opt" data-cur="RUB">\u{1F1F7}\u{1F1FA} \u0420\u0443\u0431\u043B\u0438</div>
        <div class="pay-opt" data-cur="KZT">\u{1F1F0}\u{1F1FF} \u0422\u0435\u043D\u0433\u0435</div>
      </div>
    </div>
    <div class="co-step"><h3>4. \u041A \u043E\u043F\u043B\u0430\u0442\u0435</h3>
      <div id="amount-display" class="amount-box">${fmt(plan.priceUah, 'UAH')}</div>
      <div id="pay-area"></div>
      <div id="co-alert" style="margin-top:14px"></div>
    </div>
  </div>`;

  const updateAmount = () => {
    const pid = document.getElementById('plan-select').value;
    const val = getFinalPrice(pid, currency);
    document.getElementById('amount-display').textContent = fmt(val, currency);
    renderPayArea();
  };

  function renderPayArea() {
    const area = document.getElementById('pay-area');
    const pid = document.getElementById('plan-select').value;
    const val = getFinalPrice(pid, currency);
    const sel = plans.find(p => p.id === pid);
    const cardVal = getFinalPrice(pid, 'UAH');
    const buildMsg = () => `\u{1F6D2} \u0417\u0430\u043A\u0430\u0437 Nova Client\n\u041B\u043E\u0433\u0438\u043D: ${me.username}\n\u0422\u0430\u0440\u0438\u0444: ${sel.name}\n\u0421\u0443\u043C\u043C\u0430: ${fmt(val, currency)}${promoCode ? '\n\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434: ' + promoCode : ''}\n\u0413\u043E\u0442\u043E\u0432 \u043E\u043F\u043B\u0430\u0442\u0438\u0442\u044C`;
    if (method === 'card2card') {
      area.innerHTML = `<div class="card-box" style="text-align:center">
        <div class="lbl">\u041F\u0435\u0440\u0435\u0432\u043E\u0434 \u043D\u0430 \u043A\u0430\u0440\u0442\u0443 (Mono, \u0423\u043A\u0440\u0430\u0438\u043D\u0430)</div>
        <div class="amount-box" style="font-size:34px;color:var(--g);margin:8px 0">${cardVal} \u0433\u0440\u043D</div>
        <div class="lbl">\u041D\u043E\u043C\u0435\u0440 \u043A\u0430\u0440\u0442\u044B</div>
        <div id="card-num" style="font-family:Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:2px;cursor:pointer;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;margin:6px 0 14px;border:1px solid rgba(255,255,255,0.1)">${cfg.cardNumber}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-green" id="copy-card">\u{1F4CB} \u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0443</button>
        </div>
        <div style="font-size:12px;color:#999;margin-top:16px">\u0421\u0434\u0435\u043B\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0435\u0432\u043E\u0434, \u0437\u0430\u0442\u0435\u043C \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0432 Telegram.</div>
        <a href="https://t.me/${cfg.telegram}?text=${encodeURIComponent(buildMsg())}" target="_blank" class="btn btn-pink" style="margin-top:12px;font-size:15px">\u{1F4AC} \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0432 Telegram</a>
      </div>`;
      const cn = document.getElementById('card-num');
      if (cn) cn.onclick = () => { navigator.clipboard.writeText(cfg.cardNumber.replace(/\s/g,'')); cn.textContent = '\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E!'; setTimeout(() => cn.textContent = cfg.cardNumber, 1500); };
      const cc = document.getElementById('copy-card');
      if (cc) cc.onclick = () => { navigator.clipboard.writeText(cfg.cardNumber.replace(/\s/g,'')); cc.textContent = '\u2713 \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E!'; setTimeout(() => cc.textContent = '\u{1F4CB} \u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0443', 1500); };
    } else if (method === 'crypto') {
      const usdtAmount = (val / (cfg.usdRates[currency] || cfg.usdRates.UAH)).toFixed(2);
      area.innerHTML = `<div class="card-box" style="text-align:center">
        <div class="lbl">\u041E\u043F\u043B\u0430\u0442\u0430 USDT \u00B7 \u0441\u0435\u0442\u044C ${cfg.usdtNetwork}</div>
        <div class="amount-box" style="font-size:36px;color:var(--g);margin:8px 0">${usdtAmount} <span style="font-size:22px">USDT</span></div>
        <div style="font-size:13px;color:#888;margin-bottom:14px">\u2248 ${fmt(val, currency)}</div>
        <div class="lbl">\u0410\u0434\u0440\u0435\u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 (TRC20)</div>
        <div id="usdt-addr" style="font-family:Consolas,monospace;font-size:13px;word-break:break-all;cursor:pointer;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;margin:6px 0 14px;border:1px solid rgba(255,255,255,0.1)">${cfg.usdtWallet}</div>
        <a href="https://t.me/${cfg.telegram}?text=${encodeURIComponent(buildMsg())}" target="_blank" class="btn btn-pink" style="margin-top:12px">\u{1F4AC} \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C TXID \u0432 Telegram</a>
      </div>`;
      const ua = document.getElementById('usdt-addr');
      if (ua) ua.onclick = () => { navigator.clipboard.writeText(cfg.usdtWallet); ua.textContent = '\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E!'; setTimeout(() => ua.textContent = cfg.usdtWallet, 1500); };
    } else {
      area.innerHTML = `<div class="card-box" style="text-align:center">
        <div class="lbl">\u041E\u043F\u043B\u0430\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 \u0440\u0435\u0441\u0435\u043B\u043B\u0435\u0440\u0430 \u0432 Telegram</div>
        <a id="tg-link" href="https://t.me/${cfg.telegram}" target="_blank" class="btn btn-pink" style="font-size:16px;padding:13px 28px;text-decoration:none">\u{1F4AC} \u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C @${cfg.telegram}</a>
      </div>`;
      const tl = document.getElementById('tg-link');
      if (tl) tl.href = `https://t.me/${cfg.telegram}?text=${encodeURIComponent(buildMsg())}`;
    }
  }

  document.getElementById('plan-select').onchange = () => { promoCode = ''; discountPercent = 0; document.getElementById('promo-msg').innerHTML = ''; updateAmount(); };
  document.querySelectorAll('.pay-opt').forEach(o => o.onclick = () => { document.querySelectorAll('.pay-opt').forEach(x => x.classList.remove('active')); o.classList.add('active'); currency = o.dataset.cur; updateAmount(); });

  document.getElementById('promo-apply').onclick = async () => {
    const code = document.getElementById('promo-input').value.trim();
    const msg = document.getElementById('promo-msg');
    if (!code) { msg.innerHTML = ''; promoCode = ''; discountPercent = 0; updateAmount(); return; }
    try {
      const r = await api('/api/promo/validate', { method: 'POST', body: JSON.stringify({ code, planId: document.getElementById('plan-select').value }) });
      promoCode = code; discountPercent = r.discountPercent;
      msg.innerHTML = `<span style="color:#4ade80">\u2713 ${r.description}: \u2212${r.discountPercent}% \u2192 ${fmt(getFinalPrice(document.getElementById('plan-select').value, currency), currency)}</span>`;
      updateAmount();
    } catch (e) { msg.innerHTML = `<span style="color:#f87171">${e.error}</span>`; promoCode = ''; discountPercent = 0; updateAmount(); }
  };

  updateAmount();
}

async function adminPage() {
  await refreshMe();
  app.innerHTML = `<div class="admin">
    <h1>\u0410\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C</h1><p class="sub">\u0417\u0430\u043A\u0430\u0437\u044B \u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438</p>
    <div class="dcard" style="margin-bottom:18px"><h3>\u0417\u0430\u043A\u0430\u0437\u044B</h3><div id="admin-orders" style="margin-top:12px"></div></div>
    <div class="dcard"><h3>\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438</h3><div id="admin-users" style="margin-top:12px"></div></div>
  </div>`;
  try {
    const orders = await api('/api/admin/orders');
    document.getElementById('admin-orders').innerHTML = orders.length ? `<table><thead><tr><th>ID</th><th>\u042E\u0437\u0435\u0440</th><th>\u0422\u0430\u0440\u0438\u0444</th><th>\u0421\u0443\u043C\u043C\u0430</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th><th>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F</th></tr></thead><tbody>${orders.map(o => {
      const tag = `<span class="tag tag-${o.status.replace('_','')}">${o.status}</span>`;
      const act = o.status === 'waiting_approval' ? `<button class="mini-btn mb-green" onclick="appr(${o.id})">\u041E\u0434\u043E\u0431\u0440\u0438\u0442\u044C</button><button class="mini-btn mb-red" onclick="rej(${o.id})">\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C</button>` : '';
      return `<tr><td>#${o.id}</td><td>${o.userId}</td><td>${o.planName}</td><td>${o.amount} ${o.currency}</td><td>${tag}</td><td>${act}</td></tr>`;
    }).join('')}</tbody></table>` : '<p style="color:#666">\u0417\u0430\u043A\u0430\u0437\u043E\u0432 \u043D\u0435\u0442.</p>';

    const users = await api('/api/admin/users');
    const grantOpts = '<option value="">\u2014 \u0432\u044B\u0434\u0430\u0442\u044C \u2014</option>' + ['week','month','3months','halfyear','year','lifetime'].map(id => {
      const n = ({week:'1 \u043D\u0435\u0434\u0435\u043B\u044F',month:'1 \u043C\u0435\u0441\u044F\u0446','3months':'3 \u043C\u0435\u0441\u044F\u0446\u0430',halfyear:'6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432',year:'365 \u0434\u043D\u0435\u0439',lifetime:'\u041D\u0430\u0432\u0441\u0435\u0433\u0434\u0430'})[id];
      return `<option value="${id}">${n}</option>`;
    }).join('');
    document.getElementById('admin-users').innerHTML = `<table><thead><tr><th>ID</th><th>\u041B\u043E\u0433\u0438\u043D</th><th>\u0420\u043E\u043B\u044C</th><th>\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F</th><th>HWID</th><th>\u0412\u044B\u0434\u0430\u0442\u044C</th><th>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F</th></tr></thead><tbody>${users.map(u => {
      const tag = u.role === 'owner' ? '<span class="tag tag-owner">Owner</span>' : u.role === 'admin' ? '<span class="tag tag-admin">Admin</span>' : '<span class="tag tag-user">User</span>';
      const lic = u.license && u.license.active ? (u.license.type === 'lifetime' ? 'Life \u2713' : '\u0434\u043E ' + new Date(u.license.expiresAt).toLocaleDateString('ru-RU')) : '<span style="color:#666">\u043D\u0435\u0442</span>';
      const hw = u.hwid ? `<span style="font-family:Consolas;font-size:11px">${u.hwid.substring(0,16)}\u2026</span>` : '<span style="color:#666">\u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D</span>';
      const grant = `<select class="grant-sel" data-uid="${u.id}" style="padding:5px 8px;border-radius:7px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:12px">${grantOpts}</select>`;
      const reset = u.hwid ? `<button class="mini-btn mb-red" onclick="resethwid(${u.id})">\u0421\u0431\u0440\u043E\u0441 HWID</button>` : '';
      const revoke = u.license && u.license.active ? `<button class="mini-btn mb-red" onclick="revoke(${u.id})">\u0421\u043D\u044F\u0442\u044C</button>` : '';
      return `<tr><td>${u.id}</td><td>${u.username}</td><td>${tag}</td><td>${lic}</td><td>${hw}</td><td>${grant}</td><td>${reset}${revoke}</td></tr>`;
    }).join('')}</tbody></table>`;
    document.querySelectorAll('.grant-sel').forEach(s => s.onchange = async (e) => {
      const pid = e.target.value; if (!pid) return;
      if (!confirm('\u0412\u044B\u0434\u0430\u0442\u044C?')) { e.target.value = ''; return; }
      try { await api('/api/admin/user/' + e.target.dataset.uid + '/grant', { method: 'POST', body: JSON.stringify({ planId: pid }) }); adminPage(); }
      catch (err) { alert(err.error); e.target.value = ''; }
    });
  } catch (e) { app.innerHTML += alertBox(e.error || '\u041E\u0448\u0438\u0431\u043A\u0430'); }
}

window.appr = async (id) => { try { await api('/api/admin/order/' + id + '/approve', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.rej = async (id) => { try { await api('/api/admin/order/' + id + '/reject', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.resethwid = async (id) => { if (!confirm('\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C HWID?')) return; try { await api('/api/admin/user/' + id + '/reset-hwid', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.revoke = async (id) => { if (!confirm('\u0421\u043D\u044F\u0442\u044C \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044E?')) return; try { await api('/api/admin/user/' + id + '/revoke', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };

window.addEventListener('hashchange', router);
function bootstrap() { renderNav(); refreshMe().finally(router); }
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();
