const API = '';
let token = localStorage.getItem('nova_token');
let me = null;

const app = document.getElementById('app');
const navAuth = document.getElementById('nav-auth');

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers||{}) }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw data;
  return data;
}

function saveAuth(t, u) { token = t; me = u; localStorage.setItem('nova_token', t); renderNav(); }
function logout() { token = null; me = null; localStorage.removeItem('nova_token'); renderNav(); location.hash = '#/login'; }

function renderNav() {
  if (token) {
    navAuth.innerHTML = `<a href="#/dashboard" style="color:#fff;font-weight:700">${me ? me.username : 'РљР°Р±РёРЅРµС‚'}</a> <a class="btn btn-ghost" style="padding:8px 16px" id="logout-btn">Р’С‹Р№С‚Рё</a>`;
    document.getElementById('logout-btn').onclick = logout;
  } else {
    navAuth.innerHTML = `<a href="#/login" class="btn btn-pink" style="padding:8px 18px">Р’РѕР№С‚Рё</a>`;
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

// ===== Р РћРЈРўР« =====
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
    if (path === '/admin' && me && me.role !== 'owner' && me.role !== 'admin') { app.innerHTML = '<div class="auth-wrap"><div class="auth-card"><h2>Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰С‘РЅ</h2><p class="sub">РўРѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С†РёРё</p></div></div>'; return; }
    await route();
  } catch (e) {
    app.innerHTML = '<div class="auth-wrap"><div class="auth-card"><h2>РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё</h2><p class="sub">' + (e && e.message ? e.message : 'РїРµСЂРµР·Р°РіСЂСѓР·РёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ') + '</p></div></div>';
  }
}

// ===== Р“Р›РђР’РќРђРЇ =====
function homePage() {
  app.innerHTML = `
    <div class="hero">
      <h1>NOVA CLIENT</h1>
      <p>РџСЂРµРјРёСѓРј РєР»РёРµРЅС‚ РґР»СЏ Minecraft Fabric 1.21.4. KillAura, AutoSwap, РІРёР·СѓР°Р»С‹, Р±Р°Р№РїР°СЃС‹ Рё СѓРґРѕР±РЅС‹Р№ Р»Р°СѓРЅС‡РµСЂ.</p>
      <div class="hero-btns">
        <a href="#/pricing" class="btn btn-pink">РљСѓРїРёС‚СЊ</a>
        <a href="#/login" class="btn btn-ghost">Р’РѕР№С‚Рё РІ РєР°Р±РёРЅРµС‚</a>
      </div>
    </div>
    <div class="features">
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6 3 3-6 6-3-3z"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg></div><h3>Combat РјРѕРґСѓР»Рё</h3><p>KillAura СЃ СѓРјРЅС‹РјРё СЂРѕС‚Р°С†РёСЏРјРё, AutoSwap, Criticals вЂ” РїР»Р°РІРЅРѕ Рё СЌС„С„РµРєС‚РёРІРЅРѕ.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C45BFF" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/></svg></div><h3>Р’РёР·СѓР°Р»С‹</h3><p>ESP, Chams, Skeleton, TargetESP, FullBright Рё РєСЂР°СЃРёРІС‹Р№ HUD СЃ РІРѕРґСЏРЅС‹Рј Р·РЅР°РєРѕРј.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.16 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.16-1.62 0-5 0-5"/></svg></div><h3>Р›Р°СѓРЅС‡РµСЂ</h3><p>РЎРІРѕР№ Р»Р°СѓРЅС‡РµСЂ СЃ Р°РІС‚РѕСЂРёР·Р°С†РёРµР№, РІС‹Р±РѕСЂРѕРј RAM Рё Р°РІС‚РѕРѕР±РЅРѕРІР»РµРЅРёРµРј РєРѕРЅС„РёРіРѕРІ.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C45BFF" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3>Р‘Р°Р№РїР°СЃС‹</h3><p>РђРґР°РїС‚Р°С†РёСЏ РїРѕРґ Р°РЅС‚РёС‡РёС‚С‹: Funtime, Grim, SpookyTime вЂ” СЂРѕС‚Р°С†РёРё Рё РѕР±С…РѕРґ РѕРіСЂР°РЅРёС‡РµРЅРёР№.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF8FC7" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div><h3>РћР±Р»Р°С‡РЅС‹Рµ РєРѕРЅС„РёРіРё</h3><p>РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РЅР°СЃС‚СЂРѕРµРє РјРµР¶РґСѓ СѓСЃС‚СЂРѕР№СЃС‚РІР°РјРё С‡РµСЂРµР· РІР°С€ Р°РєРєР°СѓРЅС‚.</p></div>
      <div class="feat"><div class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C45BFF" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div><h3>РўРµРјС‹</h3><p>РќРµСЃРєРѕР»СЊРєРѕ С‚РµРј РѕС„РѕСЂРјР»РµРЅРёСЏ Рё РєР°СЃС‚РѕРјРЅС‹Р№ UI.</p></div>
    </div>`;
}

// ===== Р¦Р•РќР« =====
function pricingPage() {
  app.innerHTML = `
    <div class="hero" style="padding-top:20px">
      <h1 style="font-size:48px">РўР°СЂРёС„С‹</h1>
      <p>Р’С‹Р±РµСЂРёС‚Рµ РїРѕРґС…РѕРґСЏС‰РёР№ РїР»Р°РЅ.</p>
    </div>
    <div class="pricing" id="plans"></div>`;
  fetch('/api/plans').then(r => r.json()).then(plans => {
    document.getElementById('plans').innerHTML = plans.map(p => {
      const pop = p.id === 'halfyear' ? 'popular' : '';
      const badge = p.id === 'halfyear' ? '<div class="badge">РҐРРў</div>' : '';
      const feat = p.lifetime
        ? ['Р’СЃРµ РјРѕРґСѓР»Рё РЅР°РІСЃРµРіРґР°', 'Р’СЃРµ Р±СѓРґСѓС‰РёРµ РѕР±РЅРѕРІР»РµРЅРёСЏ', 'РћР±Р»Р°С‡РЅС‹Рµ РєРѕРЅС„РёРіРё', 'Р›Р°СѓРЅС‡РµСЂ + СЃР°Р№С‚', 'РџСЂРёРѕСЂРёС‚РµС‚РЅР°СЏ РїРѕРґРґРµСЂР¶РєР°']
        : ['Р’СЃРµ РјРѕРґСѓР»Рё', 'РћР±Р»Р°С‡РЅС‹Рµ РєРѕРЅС„РёРіРё', 'Р›Р°СѓРЅС‡РµСЂ + СЃР°Р№С‚', `РЎСЂРѕРє: ${p.name}`, 'РџРѕРґРґРµСЂР¶РєР° РІ С‡Р°С‚Рµ'];
      return `<div class="plan ${pop}">${badge}<h3>${p.name}</h3><div class="dur">${p.lifetime ? 'Р±РµР·Р»РёРјРёС‚' : 'РїРѕРґРїРёСЃРєР°'}</div>
        <div class="price">${p.priceUah}<span class="cur"> РіСЂРЅ</span></div>
        <div class="kzt">РёР»Рё ${p.priceRub} в‚Ѕ В· в‰€ ${Math.round(p.priceUah * 11.5)} в‚ё</div>
        <ul>${feat.map(f => `<li>${f}</li>`).join('')}</ul>
        <a href="#/purchase?plan=${p.id}" class="btn btn-green btn-block">РљСѓРїРёС‚СЊ ${p.name}</a></div>`;
    }).join('');
  });
}

// ===== РЎРўР РђРќРР¦Рђ Р’Р«Р‘РћР Рђ РћРџР›РђРўР« =====
async function purchasePage() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const planId = params.get('plan') || 'month';
  const cfg = await fetch('/api/config').then(r => r.json());
  const plan = cfg.plans.find(p => p.id === planId) || cfg.plans[0];
  const pricesLine = `${plan.priceUah} РіСЂРЅ В· ${plan.priceRub} в‚Ѕ В· ${plan.priceKzt} в‚ё`;
  const usdtEst = (plan.priceUah / cfg.usdRates.UAH).toFixed(2);
  app.innerHTML = `
    <div style="max-width:880px;margin:0 auto">
      <h1 style="font-size:34px;margin-bottom:6px">РџРѕРєСѓРїРєР° Nova Client</h1>
      <p style="color:#888;margin-bottom:8px">РўР°СЂРёС„: <b style="color:#fff">${plan.name}</b> В· ${pricesLine} В· в‰€${usdtEst} USDT</p>
      <p style="color:#888;margin-bottom:28px">Р’С‹Р±РµСЂРёС‚Рµ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px">
        <div class="plan" style="cursor:pointer" id="opt-card2card">
          <div style="font-size:34px;margin-bottom:10px">рџ’і</div>
          <h3 style="font-size:18px;margin-bottom:8px">РљР°СЂС‚РѕР№ (РЈРєСЂР°РёРЅР°)</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">РџРµСЂРµРІРѕРґ РЅР° РєР°СЂС‚Сѓ Mono (РіСЂРёРІРЅС‹). РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РІ Telegram. Р‘РµР· РїР°СЃРїРѕСЂС‚Р°.</p>
          <span class="btn btn-green btn-block">РћРїР»Р°С‚РёС‚СЊ РєР°СЂС‚РѕР№ в†’</span>
        </div>
        <div class="plan popular" style="cursor:pointer" id="opt-crypto">
          <div class="badge">РљСЂРёРїС‚Р°</div>
          <div style="font-size:34px;margin-bottom:10px">в‚®</div>
          <h3 style="font-size:18px;margin-bottom:8px">USDT (TRC20)</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">РђРІС‚РѕРєРѕРЅРІРµСЂС‚Р°С†РёСЏ в‚ґ/в‚Ѕ/в‚ё в†’ USDT. Р”Р»СЏ С‚РµС…, Сѓ РєРѕРіРѕ РµСЃС‚СЊ РєСЂРёРїС‚Р°. Р‘РµР· РїР°СЃРїРѕСЂС‚Р°.</p>
          <span class="btn btn-green btn-block">РћРїР»Р°С‚РёС‚СЊ USDT в†’</span>
        </div>
        <div class="plan" style="cursor:pointer" id="opt-reseller">
          <div style="font-size:34px;margin-bottom:10px">рџ’¬</div>
          <h3 style="font-size:18px;margin-bottom:8px">Р§РµСЂРµР· СЂРµСЃРµР»Р»РµСЂР°</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">РћРїР»Р°С‚Р° РЅР°РїСЂСЏРјСѓСЋ РІ Telegram @${cfg.telegram}. Р›СЋР±Р°СЏ РІР°Р»СЋС‚Р°, РІС‹РґР°С‡Р° РІСЂСѓС‡РЅСѓСЋ.</p>
          <span class="btn btn-pink btn-block">РќР°РїРёСЃР°С‚СЊ РІ Telegram в†’</span>
        </div>
      </div>
    </div>`;
  document.getElementById('opt-card2card').onclick = () => location.hash = '#/checkout?plan=' + plan.id + '&method=card2card';
  document.getElementById('opt-crypto').onclick = () => location.hash = '#/checkout?plan=' + plan.id + '&method=crypto';
  document.getElementById('opt-reseller').onclick = () => {
    const msg = `рџ›’ Р—Р°РєР°Р· Nova Client\nРўР°СЂРёС„: ${plan.name}\nР¦РµРЅР°: ${pricesLine}\nРҐРѕС‡Сѓ РєСѓРїРёС‚СЊ С‡РµСЂРµР· СЂРµСЃРµР»Р»РµСЂР°`;
    window.open(`https://t.me/${cfg.telegram}?text=${encodeURIComponent(msg)}`, '_blank');
  };
}

// ===== РђР’РўРћР РР—РђР¦РРЇ =====
function authPage(isRegister) {
  const title = isRegister ? 'Р РµРіРёСЃС‚СЂР°С†РёСЏ' : 'Р’С…РѕРґ';
  const sub = isRegister ? 'РЎРѕР·РґР°Р№С‚Рµ Р°РєРєР°СѓРЅС‚ Nova Client' : 'Р’РѕР№РґРёС‚Рµ РІ Р»РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚';
  const switchTxt = isRegister ? 'РЈР¶Рµ РµСЃС‚СЊ Р°РєРєР°СѓРЅС‚? <a id="sw">Р’РѕР№С‚Рё</a>' : 'РќРµС‚ Р°РєРєР°СѓРЅС‚Р°? <a id="sw">Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ</a>';
  const emailField = isRegister ? '<div class="field"><label>Email</label><input id="u-email" type="email" placeholder="Р’Р°С€ email"></div>' : '';
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h2>${title}</h2><p class="sub">${sub}</p>
    <div id="auth-alert"></div>
    <div class="field"><label>Р›РѕРіРёРЅ</label><input id="u-username" placeholder="Р’Р°С€ Р»РѕРіРёРЅ"></div>
    ${emailField}
    <div class="field"><label>РџР°СЂРѕР»СЊ</label><input id="u-password" type="password" placeholder="Р’Р°С€ РїР°СЂРѕР»СЊ"></div>
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
      if (data.needVerify) {
        verifyPage(null, data.token, data.user, data.emailSent);
        return;
      }
      saveAuth(data.token, data.user);
      box.innerHTML = alertBox('РЈСЃРїРµС€РЅРѕ! РџРµСЂРµРЅР°РїСЂР°РІР»РµРЅРёРµ...', 'ok');
      setTimeout(() => location.hash = '#/dashboard', 600);
    } catch (e) {
      if (e.needVerify) { verifyPage(null, e.token, null, e.emailSent); return; }
      box.innerHTML = alertBox(e.error || 'РћС€РёР±РєР°');
    }
  };
  document.getElementById('u-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-submit').click(); });
}

function verifyPage(sentCode, tempToken, tempUser, emailSent) {
  const hint = emailSent === false ? 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РїРёСЃСЊРјРѕ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РїРѕР·Р¶Рµ.' : 'РљРѕРґ РѕС‚РїСЂР°РІР»РµРЅ РЅР° РІР°С€Сѓ РїРѕС‡С‚Сѓ';
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h2>РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ email</h2><p class="sub">${hint}</p>
    <div id="verify-alert"></div>
    <div class="field"><label>РљРѕРґ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ</label><input id="u-code" placeholder="6-Р·РЅР°С‡РЅС‹Р№ РєРѕРґ"></div>
    <button class="btn btn-pink btn-block" id="verify-submit">РџРѕРґС‚РІРµСЂРґРёС‚СЊ</button>
    <div class="auth-switch"><a id="resend-code">РћС‚РїСЂР°РІРёС‚СЊ РєРѕРґ СЃРЅРѕРІР°</a></div>
  </div></div>`;
  if (tempToken) localStorage.setItem('nova_token', tempToken);
  document.getElementById('verify-submit').onclick = async () => {
    const code = document.getElementById('u-code').value.trim();
    const box = document.getElementById('verify-alert');
    try {
      const data = await api('/api/verify', { method: 'POST', body: JSON.stringify({ code }) });
      saveAuth(data.token, data.user);
      box.innerHTML = alertBox('Email РїРѕРґС‚РІРµСЂР¶РґС‘РЅ! РџРµСЂРµРЅР°РїСЂР°РІР»РµРЅРёРµ...', 'ok');
      setTimeout(() => location.hash = '#/dashboard', 600);
    } catch (e) {
      box.innerHTML = alertBox(e.error || 'РќРµРІРµСЂРЅС‹Р№ РєРѕРґ');
    }
  };
  const resend = document.getElementById('resend-code');
  if (resend) resend.onclick = async () => {
    try { await api('/api/resend', { method: 'POST' }); } catch {}
  };
}

// ===== Р›РР§РќР«Р™ РљРђР‘РРќР•Рў =====
async function dashboardPage() {
  await refreshMe();
  if (!me) return;
  const lic = me.license;
  let status, statusClass, meta;
  if (lic && lic.active) {
    if (lic.type === 'lifetime') { status = 'РђРєС‚РёРІРЅР° (РќР°РІСЃРµРіРґР°)'; statusClass = 'active'; meta = 'Р›РёС†РµРЅР·РёСЏ Р±РµР· РѕРіСЂР°РЅРёС‡РµРЅРёСЏ СЃСЂРѕРєР°'; }
    else if (lic.expiresAt > Date.now()) {
      const days = Math.ceil((lic.expiresAt - Date.now()) / 86400000);
      status = 'РђРєС‚РёРІРЅР°'; statusClass = 'active'; meta = `РћСЃС‚Р°Р»РѕСЃСЊ: ${days} РґРЅ. В· РґРѕ ${new Date(lic.expiresAt).toLocaleDateString('ru-RU')}`;
    } else { status = 'РСЃС‚РµРєР»Р°'; statusClass = 'inactive'; meta = 'РљСѓРїРёС‚Рµ РїРѕРґРїРёСЃРєСѓ РґР»СЏ РїСЂРѕРґРѕР»Р¶РµРЅРёСЏ'; }
  } else { status = 'РќРµС‚ Р»РёС†РµРЅР·РёРё'; statusClass = 'inactive'; meta = 'РљСѓРїРёС‚Рµ С‚Р°СЂРёС„ РЅР° СЃС‚СЂР°РЅРёС†Рµ С†РµРЅ'; }

  const roleTag = me.role === 'owner' ? '<span class="tag tag-owner">Owner</span>'
    : me.role === 'admin' ? '<span class="tag tag-admin">Admin</span>' : '<span class="tag tag-user">User</span>';

  app.innerHTML = `<div class="dash">
    <h1>РџСЂРёРІРµС‚, ${me.username} ${roleTag}</h1>
    <div class="dash-grid">
      <div class="dcard"><h3>Р›РёС†РµРЅР·РёСЏ</h3><div class="big ${statusClass}">${status}</div><div class="meta">${meta}</div></div>
      <div class="dcard"><h3>РђРєРєР°СѓРЅС‚</h3><div class="big" style="font-size:20px">${me.username}</div><div class="meta">Р РѕР»СЊ: ${me.role} В· ID: ${me.id}</div></div>
    </div>
    <div class="dcard">
      <h3>Р”РµР№СЃС‚РІРёСЏ</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px">
        <a href="#/pricing" class="btn btn-pink">РљСѓРїРёС‚СЊ / РїСЂРѕРґР»РёС‚СЊ</a>
        <a href="/api/download/launcher" class="btn btn-green">в¬‡ РЎРєР°С‡Р°С‚СЊ Р»Р°СѓРЅС‡РµСЂ</a>
        ${me.role === 'owner' || me.role === 'admin' ? '<a href="#/admin" class="btn btn-ghost">РђРґРјРёРЅ-РїР°РЅРµР»СЊ</a>' : ''}
      </div>
    </div>
    <div class="dcard" style="margin-top:18px">
      <h3>РњРѕРё Р·Р°РєР°Р·С‹</h3>
      <div id="my-orders" style="margin-top:10px"></div>
    </div>
  </div>`;
  loadMyOrders();
}

async function loadMyOrders() {
  try {
    const orders = await api('/api/orders');
    const el = document.getElementById('my-orders');
    if (!orders.length) { el.innerHTML = '<p style="color:#666;font-size:14px">Р—Р°РєР°Р·РѕРІ РїРѕРєР° РЅРµС‚.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>РўР°СЂРёС„</th><th>РЎСѓРјРјР°</th><th>РЎС‚Р°С‚СѓСЃ</th><th>Р”Р°С‚Р°</th></tr></thead><tbody>${orders.map(o => {
      const tag = `<span class="tag tag-${o.status.replace('_','')}">${({pending_payment:'РћР¶РёРґР°РµС‚ РѕРїР»Р°С‚С‹',waiting_approval:'РќР° РїСЂРѕРІРµСЂРєРµ',approved:'РђРєС‚РёРІРЅР°',rejected:'РћС‚РєР»РѕРЅРµРЅР°'})[o.status]}</span>`;
      return `<tr><td>${o.planName}</td><td>${o.amountPayable} ${o.currency}</td><td>${tag}</td><td>${new Date(o.createdAt).toLocaleDateString('ru-RU')}</td></tr>`;
    }).join('')}</tbody></table>`;
  } catch {}
}

// ===== Р§Р•РљРђРЈРў =====
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

  const curLabel = c => c === 'RUB' ? 'в‚Ѕ' : c === 'KZT' ? 'в‚ё' : 'РіСЂРЅ';
  const curFlag = c => c === 'RUB' ? 'рџ‡·рџ‡є' : c === 'KZT' ? 'рџ‡°рџ‡ї' : 'рџ‡єрџ‡¦';
  const basePrice = (pid, cur) => {
    const p = plans.find(x => x.id === pid);
    return cur === 'RUB' ? p.priceRub : cur === 'KZT' ? p.priceKzt : p.priceUah;
  };
  const fmt = (val, cur) => cur === 'KZT' ? Math.round(val) + ' в‚ё' : val + ' ' + curLabel(cur);

  app.innerHTML = `<div class="checkout">
    <h1 style="font-size:28px;margin-bottom:6px">${method === 'card' ? 'РћРїР»Р°С‚Р° РєР°СЂС‚РѕР№' : method === 'card2card' ? 'РџРµСЂРµРІРѕРґ РЅР° РєР°СЂС‚Сѓ (Mono)' : method === 'crypto' ? 'РћРїР»Р°С‚Р° USDT' : 'РћРїР»Р°С‚Р° С‡РµСЂРµР· СЂРµСЃРµР»Р»РµСЂР°'}</h1>
    <p style="color:#888;margin-bottom:20px">РўР°СЂРёС„: <b style="color:#fff">${plan.name}</b></p>
    <div class="co-step"><h3>1. РўР°СЂРёС„</h3>
      <select id="plan-select" style="width:100%;padding:12px;border-radius:10px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:15px">
        ${plans.map(p => `<option value="${p.id}" ${p.id===planId?'selected':''}>${p.name} вЂ” ${p.priceUah} РіСЂРЅ / ${p.priceRub} в‚Ѕ</option>`).join('')}
      </select>
    </div>
    <div class="co-step"><h3>2. РџСЂРѕРјРѕРєРѕРґ</h3>
      <div style="display:flex;gap:10px">
        <input id="promo-input" placeholder="РџСЂРѕРјРѕРєРѕРґ" style="flex:1;padding:12px 16px;border-radius:10px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:15px;outline:none">
        <button class="btn btn-ghost" id="promo-apply">РџСЂРёРјРµРЅРёС‚СЊ</button>
      </div>
      <div id="promo-msg" style="margin-top:10px;font-size:14px"></div>
    </div>
    <div class="co-step"><h3>3. Р’Р°Р»СЋС‚Р° ${method==='card' ? '(Р°РІС‚РѕРєРѕРЅРІРµСЂС‚Р°С†РёСЏ)' : ''}</h3>
      <div class="pay-row" style="flex-wrap:wrap">
        <div class="pay-opt active" data-cur="UAH">${curFlag('UAH')} Р“СЂРёРІРЅС‹</div>
        <div class="pay-opt" data-cur="RUB">${curFlag('RUB')} Р СѓР±Р»Рё</div>
        <div class="pay-opt" data-cur="KZT">${curFlag('KZT')} РўРµРЅРіРµ</div>
      </div>
    </div>
    <div class="co-step"><h3>4. Рљ РѕРїР»Р°С‚Рµ</h3>
      <div id="amount-display" class="amount-box">${fmt(plan.priceUah, 'UAH')}</div>
      <div id="pay-area"></div>
      <div id="co-alert" style="margin-top:14px"></div>
    </div>
  </div>`;

  let discountPercent = 0;
  const getFinalPrice = (pid, cur) => {
    const base = basePrice(pid, cur);
    return discountPercent > 0 ? +(base * (1 - discountPercent / 100)).toFixed(2) : base;
  };
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
    const buildMsg = () => `рџ›’ Р—Р°РєР°Р· Nova Client\nР›РѕРіРёРЅ: ${me.username}\nРўР°СЂРёС„: ${sel.name}\nРЎСѓРјРјР°: ${fmt(val, currency)}${promoCode ? '\nРџСЂРѕРјРѕРєРѕРґ: ' + promoCode : ''}\nР“РѕС‚РѕРІ РѕРїР»Р°С‚РёС‚СЊ, РІС‹РґР°Р№С‚Рµ Р»РёС†РµРЅР·РёСЋ РїРѕР¶Р°Р»СѓР№СЃС‚Р°`;
    if (method === 'card') {
      if (cfg.paymentProvider === 'paypal' && cfg.paypalClientId) {
        area.innerHTML = `<div id="paypal-container" style="margin-top:10px"></div>`;
        renderPaypal(cfg.paypalClientId, val, currency, sel.name);
      } else {
        area.innerHTML = `<div class="card-box" style="text-align:center">
          <div class="lbl">РћРїР»Р°С‚Р° РєР°СЂС‚РѕР№ РЅРµ РїРѕРґРєР»СЋС‡РµРЅР°</div>
          <div style="font-size:14px;color:#ccc;margin:10px 0 16px">РСЃРїРѕР»СЊР·СѓР№С‚Рµ РѕРїР»Р°С‚Сѓ РєСЂРёРїС‚РѕР№ (USDT) РёР»Рё С‡РµСЂРµР· СЂРµСЃРµР»Р»РµСЂР°.</div>
          <a href="#/purchase?plan=${pid}" class="btn btn-ghost">в†ђ Р’С‹Р±СЂР°С‚СЊ РґСЂСѓРіРѕР№ СЃРїРѕСЃРѕР±</a>
        </div>`;
      }
    } else if (method === 'card2card') {
      const uahAmount = Math.round(cardVal * 100) / 100;
      area.innerHTML = `
        <div class="card-box" style="text-align:center">
          <div class="lbl">РџРµСЂРµРІРѕРґ РЅР° РєР°СЂС‚Сѓ (Mono, РЈРєСЂР°РёРЅР°)</div>
          <div class="amount-box" style="font-size:34px;color:var(--g);margin:8px 0">${uahAmount} РіСЂРЅ</div>
          <div style="font-size:13px;color:#888;margin-bottom:14px">РћРїР»Р°С‚Р° РІ РіСЂРёРІРЅР°С…. Р”Р»СЏ СЂРѕСЃСЃРёСЏРЅ вЂ” РєРѕРЅРІРµСЂС‚Р°С†РёСЏ С‡РµСЂРµР· РўР“.</div>
          <div class="lbl">РќРѕРјРµСЂ РєР°СЂС‚С‹</div>
          <div id="card-num" style="font-family:Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:2px;cursor:pointer;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;margin:6px 0 14px;border:1px solid rgba(255,255,255,0.1)">${cfg.cardNumber}</div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-green" id="copy-card">рџ“‹ РљРѕРїРёСЂРѕРІР°С‚СЊ РєР°СЂС‚Сѓ</button>
            <button class="btn btn-ghost" id="copy-amt2">РљРѕРїРёСЂРѕРІР°С‚СЊ СЃСѓРјРјСѓ</button>
          </div>
          <div style="font-size:12px;color:#999;margin-top:16px;line-height:1.5">РЎРґРµР»Р°Р№С‚Рµ РїРµСЂРµРІРѕРґ РЅР° РєР°СЂС‚Сѓ Mono, Р·Р°С‚РµРј РѕС‚РїСЂР°РІСЊС‚Рµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РІ Telegram вЂ” Р»РёС†РµРЅР·РёСЋ РІС‹РґР°РґСѓС‚ РїРѕСЃР»Рµ РїСЂРѕРІРµСЂРєРё.</div>
          <a href="https://t.me/${cfg.telegram}?text=${encodeURIComponent('рџ›’ РћРїР»Р°С‚Р° Nova Client РєР°СЂС‚РѕР№\nР›РѕРіРёРЅ: ' + me.username + '\nРўР°СЂРёС„: ' + sel.name + '\nРЎСѓРјРјР°: ' + uahAmount + ' РіСЂРЅ\nРџРµСЂРµРІС‘Р» РЅР° РєР°СЂС‚Сѓ ' + cfg.cardNumber + ', Р¶РґСѓ Р»РёС†РµРЅР·РёСЋ')}" target="_blank" class="btn btn-pink" style="margin-top:12px;font-size:15px">рџ’¬ РћС‚РїСЂР°РІРёС‚СЊ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РІ Telegram</a>
        </div>`;
      document.getElementById('copy-card').onclick = () => { navigator.clipboard.writeText(cfg.cardNumber.replace(/\s/g,'')); const b = document.getElementById('copy-card'); const t = b.textContent; b.textContent = 'вњ“ РЎРєРѕРїРёСЂРѕРІР°РЅРѕ!'; setTimeout(() => b.textContent = t, 1500); };
      document.getElementById('copy-amt2').onclick = () => { navigator.clipboard.writeText(String(val)); const b = document.getElementById('copy-amt2'); const t = b.textContent; b.textContent = 'вњ“ РЎРєРѕРїРёСЂРѕРІР°РЅРѕ!'; setTimeout(() => b.textContent = t, 1500); };
    } else if (method === 'crypto') {
      const usdtAmount = (val / (cfg.usdRates[currency] || cfg.usdRates.UAH)).toFixed(2);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('tron:' + cfg.usdtWallet)}`;
      area.innerHTML = `
        <div class="card-box" style="text-align:center">
          <div class="lbl">РћРїР»Р°С‚Р° USDT В· СЃРµС‚СЊ ${cfg.usdtNetwork}</div>
          <div class="amount-box" style="font-size:36px;color:var(--g);margin:8px 0">${usdtAmount} <span style="font-size:22px">USDT</span></div>
          <div style="font-size:13px;color:#888;margin-bottom:14px">в‰€ ${fmt(val, currency)} В· Р°РІС‚РѕРєРѕРЅРІРµСЂС‚Р°С†РёСЏ РїРѕ РєСѓСЂСЃСѓ 1 USDT = $1</div>
          <img src="${qrUrl}" alt="QR" style="width:180px;height:180px;border-radius:12px;margin:0 auto 14px;display:block;background:#fff;padding:8px">
          <div class="lbl">РђРґСЂРµСЃ РєРѕС€РµР»СЊРєР° (TRC20)</div>
          <div id="usdt-addr" style="font-family:Consolas,monospace;font-size:13px;word-break:break-all;cursor:pointer;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;margin:6px 0 14px;border:1px solid rgba(255,255,255,0.1)">${cfg.usdtWallet}</div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-green" id="copy-addr">рџ“‹ РљРѕРїРёСЂРѕРІР°С‚СЊ Р°РґСЂРµСЃ</button>
            <button class="btn btn-ghost" id="copy-amt">РљРѕРїРёСЂРѕРІР°С‚СЊ СЃСѓРјРјСѓ</button>
          </div>
          <div style="font-size:12px;color:#999;margin-top:16px;line-height:1.5">вљ  РћС‚РїСЂР°РІР»СЏР№С‚Рµ <b>С‚РѕР»СЊРєРѕ USDT</b> РІ СЃРµС‚Рё <b>TRC20</b>. РџРѕСЃР»Рµ РїРµСЂРµРІРѕРґР° РѕС‚РїСЂР°РІСЊС‚Рµ TXID (С…СЌС€ С‚СЂР°РЅР·Р°РєС†РёРё) РІ Telegram вЂ” Р»РёС†РµРЅР·РёСЋ РІС‹РґР°РґСѓС‚ РїРѕСЃР»Рµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ СЃРµС‚Рё.</div>
          <a href="https://t.me/${cfg.telegram}?text=${encodeURIComponent('рџ›’ РћРїР»Р°С‚Р° Nova Client USDT\nР›РѕРіРёРЅ: ' + me.username + '\nРўР°СЂРёС„: ' + sel.name + '\nРЎСѓРјРјР°: ' + usdtAmount + ' USDT\nTXID: <РІСЃС‚Р°РІСЊС‚Рµ С…СЌС€ С‚СЂР°РЅР·Р°РєС†РёРё>')}" target="_blank" class="btn btn-pink" style="margin-top:12px;font-size:15px">рџ’¬ РћС‚РїСЂР°РІРёС‚СЊ TXID РІ Telegram</a>
        </div>`;
      document.getElementById('copy-addr').onclick = () => { navigator.clipboard.writeText(cfg.usdtWallet); const b = document.getElementById('copy-addr'); const t = b.textContent; b.textContent = 'вњ“ РЎРєРѕРїРёСЂРѕРІР°РЅРѕ!'; setTimeout(() => b.textContent = t, 1500); };
      document.getElementById('copy-amt').onclick = () => { navigator.clipboard.writeText(usdtAmount); const b = document.getElementById('copy-amt'); const t = b.textContent; b.textContent = 'вњ“ РЎРєРѕРїРёСЂРѕРІР°РЅРѕ!'; setTimeout(() => b.textContent = t, 1500); };
    } else {
      area.innerHTML = `<div class="card-box" style="text-align:center">
        <div class="lbl">РћРїР»Р°С‚Р° С‡РµСЂРµР· СЂРµСЃРµР»Р»РµСЂР° РІ Telegram</div>
        <div style="font-size:14px;color:#ccc;margin:10px 0 16px">РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ вЂ” РѕС‚РєСЂРѕРµС‚СЃСЏ С‡Р°С‚ СЃ РіРѕС‚РѕРІС‹Рј СЃРѕРѕР±С‰РµРЅРёРµРј. РџРѕСЃР»Рµ РѕРїР»Р°С‚С‹ Р»РёС†РµРЅР·РёСЋ РІС‹РґР°РґСѓС‚ РІСЂСѓС‡РЅСѓСЋ.</div>
        <a id="tg-link" href="https://t.me/${cfg.telegram}" target="_blank" class="btn btn-pink" style="font-size:16px;padding:13px 28px;text-decoration:none">рџ’¬ РќР°РїРёСЃР°С‚СЊ @${cfg.telegram}</a>
        <div style="margin-top:12px"><button class="btn btn-ghost" id="copy-msg" style="font-size:13px">РЎРєРѕРїРёСЂРѕРІР°С‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ</button></div>
      </div>`;
      document.getElementById('tg-link').href = `https://t.me/${cfg.telegram}?text=${encodeURIComponent(buildMsg())}`;
      document.getElementById('copy-msg').onclick = () => { navigator.clipboard.writeText(buildMsg()); const b = document.getElementById('copy-msg'); const t = b.textContent; b.textContent = 'вњ“ РЎРєРѕРїРёСЂРѕРІР°РЅРѕ!'; setTimeout(() => b.textContent = t, 1500); };
    }
  }

  function renderPaypal(clientId, amount, cur, name) {
    if (!clientId) return;
    if (!window.paypal) {
      const s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?client-id=' + clientId + '&currency=' + (cur === 'RUB' ? 'RUB' : cur === 'KZT' ? 'KZT' : 'UAH');
      s.onload = () => doPaypal(clientId, amount, cur, name);
      document.body.appendChild(s);
    } else { doPaypal(clientId, amount, cur, name); }
  }
  function doPaypal(clientId, amount, cur, name) {
    if (!window.paypal || !document.getElementById('paypal-container')) return;
    window.paypal.Buttons({
      createOrder: (_, actions) => actions.order.create({
        purchase_units: [{ amount: { value: String(amount), currency_code: cur === 'RUB' ? 'RUB' : cur === 'KZT' ? 'KZT' : 'UAH' }, description: 'Nova Client вЂ” ' + name }]
      }),
      onApprove: async (_, actions) => {
        await actions.order.capture();
        document.getElementById('co-alert').innerHTML = alertBox('РћРїР»Р°С‚Р° РїСЂРѕС€Р»Р°! Р—Р°РєР°Р· РѕР±СЂР°Р±Р°С‚С‹РІР°РµС‚СЃСЏ.', 'ok');
        try { await api('/api/payment/create', { method: 'POST', body: JSON.stringify({ planId: document.getElementById('plan-select').value, currency, promoCode }) }); } catch {}
        setTimeout(() => location.hash = '#/dashboard', 2000);
      }
    }).render('#paypal-container');
  }

  document.getElementById('plan-select').onchange = () => { promoCode = ''; discountPercent = 0; document.getElementById('promo-msg').innerHTML = ''; updateAmount(); };
  document.querySelectorAll('.pay-opt').forEach(o => o.onclick = () => { document.querySelectorAll('.pay-opt').forEach(x => x.classList.remove('active')); o.classList.add('active'); currency = o.dataset.cur; updateAmount(); });

  document.getElementById('promo-apply').onclick = async () => {
    const code = document.getElementById('promo-input').value.trim();
    const msg = document.getElementById('promo-msg');
    if (!code) { msg.innerHTML = ''; promoCode = ''; discountPercent = 0; updateAmount(); return; }
    try {
      const r = await api('/api/promo/validate', { method: 'POST', body: JSON.stringify({ code, planId: document.getElementById('plan-select').value, currency }) });
      promoCode = code; discountPercent = r.discountPercent;
      msg.innerHTML = `<span style="color:#4ade80">вњ“ ${r.description}: в€’${r.discountPercent}% в†’ ${fmt(getFinalPrice(document.getElementById('plan-select').value, currency), currency)}</span>`;
      updateAmount();
    } catch (e) { msg.innerHTML = `<span style="color:#f87171">${e.error}</span>`; promoCode = ''; discountPercent = 0; updateAmount(); }
  };

  updateAmount();
}

// ===== РђР”РњРРќРљРђ =====
async function adminPage() {
  await refreshMe();
  app.innerHTML = `<div class="admin">
    <h1>РђРґРјРёРЅ-РїР°РЅРµР»СЊ</h1><p class="sub">Р—Р°РєР°Р·С‹ РЅР° РјРѕРґРµСЂР°С†РёРё Рё СѓРїСЂР°РІР»РµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё</p>
    <div class="dcard" style="margin-bottom:18px"><h3>Р—Р°РєР°Р·С‹ (РѕР¶РёРґР°СЋС‚ РїСЂРѕРІРµСЂРєРё)</h3><div id="admin-orders" style="margin-top:12px"></div></div>
    <div class="dcard"><h3>РџРѕР»СЊР·РѕРІР°С‚РµР»Рё</h3><div id="admin-users" style="margin-top:12px"></div></div>
  </div>`;
  try {
    const orders = await api('/api/admin/orders');
    const ods = orders.filter(o => o.status === 'waiting_approval' || o.status === 'pending_payment');
    const all = orders;
    document.getElementById('admin-orders').innerHTML = all.length ? `<table><thead><tr><th>ID</th><th>Р®Р·РµСЂ</th><th>РўР°СЂРёС„</th><th>РЎСѓРјРјР°</th><th>РџСЂРѕРјРѕ</th><th>РЎС‚Р°С‚СѓСЃ</th><th>Р”РµР№СЃС‚РІРёСЏ</th></tr></thead><tbody>${all.map(o => {
      const u = o.userId; const tag = `<span class="tag tag-${o.status.replace('_','')}">${o.status}</span>`;
      const act = o.status === 'waiting_approval' ? `<button class="mini-btn mb-green" onclick="appr(${o.id})">РћРґРѕР±СЂРёС‚СЊ</button><button class="mini-btn mb-red" onclick="rej(${o.id})">РћС‚РєР»РѕРЅРёС‚СЊ</button>` : '';
      return `<tr><td>#${o.id}</td><td>${o.userId}</td><td>${o.planName}</td><td>${o.amountPayable} ${o.currency}</td><td>${o.promoCode||'вЂ”'}</td><td>${tag}</td><td>${act}</td></tr>`;
    }).join('')}</tbody></table>` : '<p style="color:#666">Р—Р°РєР°Р·РѕРІ РЅРµС‚.</p>';

    const users = await api('/api/admin/users');
    const grantOpts = '<option value="">вЂ” РІС‹РґР°С‚СЊ вЂ”</option>' + ['month','halfyear','lifetime'].map(id => {
      const p = ({month:'1 РјРµСЃСЏС†',halfyear:'6 РјРµСЃСЏС†РµРІ',lifetime:'РќР°РІСЃРµРіРґР°'})[id];
      return `<option value="${id}">${p}</option>`;
    }).join('');
    document.getElementById('admin-users').innerHTML = `<table><thead><tr><th>ID</th><th>Р›РѕРіРёРЅ</th><th>Р РѕР»СЊ</th><th>Р›РёС†РµРЅР·РёСЏ</th><th>HWID</th><th>Р’С‹РґР°С‚СЊ РїРѕРґРїРёСЃРєСѓ</th><th>Р”РµР№СЃС‚РІРёСЏ</th></tr></thead><tbody>${users.map(u => {
      const tag = u.role === 'owner' ? '<span class="tag tag-owner">Owner</span>' : u.role === 'admin' ? '<span class="tag tag-admin">Admin</span>' : '<span class="tag tag-user">User</span>';
      const lic = u.license && u.license.active ? (u.license.type === 'lifetime' ? 'Life вњ“' : 'РґРѕ ' + new Date(u.license.expiresAt).toLocaleDateString('ru-RU')) : '<span style="color:#666">РЅРµС‚</span>';
      const hw = u.hwid ? `<span style="font-family:Consolas;font-size:11px">${u.hwid.substring(0,16)}вЂ¦</span>` : '<span style="color:#666">вЂ”</span>';
      const grant = `<select class="grant-sel" data-uid="${u.id}" style="padding:5px 8px;border-radius:7px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:12px">${grantOpts}</select>`;
      const reset = u.hwid ? `<button class="mini-btn mb-red" onclick="resethwid(${u.id})">РЎР±СЂРѕСЃ HWID</button>` : '';
      const revoke = u.license && u.license.active ? `<button class="mini-btn mb-red" onclick="revoke(${u.id})">РЎРЅСЏС‚СЊ</button>` : '';
      return `<tr><td>${u.id}</td><td>${u.username}</td><td>${tag}</td><td>${lic}</td><td>${hw}</td><td>${grant}</td><td>${reset}${revoke}</td></tr>`;
    }).join('')}</tbody></table>`;
    document.querySelectorAll('.grant-sel').forEach(s => s.onchange = async (e) => {
      const pid = e.target.value; if (!pid) return;
      if (!confirm('Р’С‹РґР°С‚СЊ С‚Р°СЂРёС„ В«' + e.target.options[e.target.selectedIndex].text + 'В» СЋР·РµСЂСѓ #' + e.target.dataset.uid + '?')) { e.target.value = ''; return; }
      try { await api('/api/admin/user/' + e.target.dataset.uid + '/grant', { method: 'POST', body: JSON.stringify({ planId: pid }) }); adminPage(); }
      catch (err) { alert(err.error); e.target.value = ''; }
    });
  } catch (e) { app.innerHTML += alertBox(e.error || 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё'); }
}

window.appr = async (id) => { try { await api('/api/admin/order/' + id + '/approve', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.rej = async (id) => { try { await api('/api/admin/order/' + id + '/reject', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.resethwid = async (id) => { if (!confirm('РЎР±СЂРѕСЃРёС‚СЊ HWID-РїСЂРёРІСЏР·РєСѓ СЌС‚РѕРіРѕ Р°РєРєР°СѓРЅС‚Р°?')) return; try { await api('/api/admin/user/' + id + '/reset-hwid', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.revoke = async (id) => { if (!confirm('РЎРЅСЏС‚СЊ Р»РёС†РµРЅР·РёСЋ Сѓ СЌС‚РѕРіРѕ СЋР·РµСЂР°?')) return; try { await api('/api/admin/user/' + id + '/revoke', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };

// ===== INIT =====
window.addEventListener('hashchange', router);
function bootstrap() { renderNav(); refreshMe().finally(router); }
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();
