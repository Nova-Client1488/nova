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
    navAuth.innerHTML = `<a href="#/dashboard" style="color:#fff;font-weight:700">${me ? me.username : 'Кабинет'}</a> <a class="btn btn-ghost" style="padding:8px 16px" id="logout-btn">Выйти</a>`;
    document.getElementById('logout-btn').onclick = logout;
  } else {
    navAuth.innerHTML = `<a href="#/login" class="btn btn-pink" style="padding:8px 18px">Войти</a>`;
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

// ===== РОУТЫ =====
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
    if (path === '/admin' && me && me.role !== 'owner' && me.role !== 'admin') { app.innerHTML = '<div class="auth-wrap"><div class="auth-card"><h2>Доступ запрещён</h2><p class="sub">Только для администрации</p></div></div>'; return; }
    await route();
  } catch (e) {
    app.innerHTML = '<div class="auth-wrap"><div class="auth-card"><h2>Ошибка загрузки</h2><p class="sub">' + (e && e.message ? e.message : 'перезагрузите страницу') + '</p></div></div>';
  }
}

// ===== ГЛАВНАЯ =====
function homePage() {
  app.innerHTML = `
    <div class="hero">
      <h1>NOVA CLIENT</h1>
      <p>Премиум клиент для Minecraft Fabric 1.21.4. KillAura, AutoSwap, визуалы, байпасы и удобный лаунчер.</p>
      <div class="hero-btns">
        <a href="#/pricing" class="btn btn-pink">Купить</a>
        <a href="#/login" class="btn btn-ghost">Войти в кабинет</a>
      </div>
    </div>
    <div class="features">
      <div class="feat"><div class="ico">⚔️</div><h3>Combat модули</h3><p>KillAura с умными ротациями, AutoSwap, Criticals — плавно и эффективно.</p></div>
      <div class="feat"><div class="ico">🎨</div><h3>Визуалы</h3><p>ESP, Chams, Skeleton, TargetESP, FullBright и красивый HUD с водяным знаком.</p></div>
      <div class="feat"><div class="ico">🚀</div><h3>Лаунчер</h3><p>Свой лаунчер с авторизацией, выбором RAM и автообновлением конфигов.</p></div>
      <div class="feat"><div class="ico">🛡️</div><h3>Байпасы</h3><p>Адаптация под античиты: Funtime, Grim, SpookyTime — ротации и обход ограничений.</p></div>
      <div class="feat"><div class="ico">💾</div><h3>Облачные конфиги</h3><p>Синхронизация настроек между устройствами через ваш аккаунт.</p></div>
      <div class="feat"><div class="ico">🌙</div><h3>Темы</h3><p>Несколько тем оформления и кастомный UI.</p></div>
    </div>`;
}

// ===== ЦЕНЫ =====
function pricingPage() {
  app.innerHTML = `
    <div class="hero" style="padding-top:20px">
      <h1 style="font-size:48px">Тарифы</h1>
      <p>Выберите подходящий план. Промокод <b style="color:var(--p2)">Release</b> даёт скидку 50% на любой тариф.</p>
    </div>
    <div class="pricing" id="plans"></div>`;
  fetch('/api/plans').then(r => r.json()).then(plans => {
    document.getElementById('plans').innerHTML = plans.map(p => {
      const pop = p.id === 'halfyear' ? 'popular' : '';
      const badge = p.id === 'halfyear' ? '<div class="badge">ХИТ</div>' : '';
      const feat = p.lifetime
        ? ['Все модули навсегда', 'Все будущие обновления', 'Облачные конфиги', 'Лаунчер + сайт', 'Приоритетная поддержка']
        : ['Все модули', 'Облачные конфиги', 'Лаунчер + сайт', `Срок: ${p.name}`, 'Поддержка в чате'];
      return `<div class="plan ${pop}">${badge}<h3>${p.name}</h3><div class="dur">${p.lifetime ? 'безлимит' : 'подписка'}</div>
        <div class="price">${p.priceUah}<span class="cur"> грн</span></div>
        <div class="kzt">или ${p.priceRub} ₽ · ≈ ${Math.round(p.priceUah * 11.5)} ₸</div>
        <ul>${feat.map(f => `<li>${f}</li>`).join('')}</ul>
        <a href="#/purchase?plan=${p.id}" class="btn btn-green btn-block">Купить ${p.name}</a></div>`;
    }).join('');
  });
}

// ===== СТРАНИЦА ВЫБОРА ОПЛАТЫ =====
async function purchasePage() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const planId = params.get('plan') || 'month';
  const cfg = await fetch('/api/config').then(r => r.json());
  const plan = cfg.plans.find(p => p.id === planId) || cfg.plans[0];
  const pricesLine = `${plan.priceUah} грн · ${plan.priceRub} ₽ · ${plan.priceKzt} ₸`;
  const usdtEst = (plan.priceUah / cfg.usdRates.UAH).toFixed(2);
  app.innerHTML = `
    <div style="max-width:880px;margin:0 auto">
      <h1 style="font-size:34px;margin-bottom:6px">Покупка Nova Client</h1>
      <p style="color:#888;margin-bottom:8px">Тариф: <b style="color:#fff">${plan.name}</b> · ${pricesLine} · ≈${usdtEst} USDT</p>
      <p style="color:#888;margin-bottom:28px">Выберите способ оплаты</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px">
        <div class="plan" style="cursor:pointer" id="opt-card2card">
          <div style="font-size:34px;margin-bottom:10px">💳</div>
          <h3 style="font-size:18px;margin-bottom:8px">Картой (Украина)</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">Перевод на карту Mono (гривны). Подтверждение в Telegram. Без паспорта.</p>
          <span class="btn btn-green btn-block">Оплатить картой →</span>
        </div>
        <div class="plan popular" style="cursor:pointer" id="opt-crypto">
          <div class="badge">Крипта</div>
          <div style="font-size:34px;margin-bottom:10px">₮</div>
          <h3 style="font-size:18px;margin-bottom:8px">USDT (TRC20)</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">Автоконвертация ₴/₽/₸ → USDT. Для тех, у кого есть крипта. Без паспорта.</p>
          <span class="btn btn-green btn-block">Оплатить USDT →</span>
        </div>
        <div class="plan" style="cursor:pointer" id="opt-reseller">
          <div style="font-size:34px;margin-bottom:10px">💬</div>
          <h3 style="font-size:18px;margin-bottom:8px">Через реселлера</h3>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:14px">Оплата напрямую в Telegram @${cfg.telegram}. Любая валюта, выдача вручную.</p>
          <span class="btn btn-pink btn-block">Написать в Telegram →</span>
        </div>
      </div>
    </div>`;
  document.getElementById('opt-card2card').onclick = () => location.hash = '#/checkout?plan=' + plan.id + '&method=card2card';
  document.getElementById('opt-crypto').onclick = () => location.hash = '#/checkout?plan=' + plan.id + '&method=crypto';
  document.getElementById('opt-reseller').onclick = () => {
    const msg = `🛒 Заказ Nova Client\nТариф: ${plan.name}\nЦена: ${pricesLine}\nХочу купить через реселлера`;
    window.open(`https://t.me/${cfg.telegram}?text=${encodeURIComponent(msg)}`, '_blank');
  };
}

// ===== АВТОРИЗАЦИЯ =====
function authPage(isRegister) {
  const title = isRegister ? 'Регистрация' : 'Вход';
  const sub = isRegister ? 'Создайте аккаунт Nova Client' : 'Войдите в личный кабинет';
  const switchTxt = isRegister ? 'Уже есть аккаунт? <a id="sw">Войти</a>' : 'Нет аккаунта? <a id="sw">Зарегистрироваться</a>';
  const emailField = isRegister ? '<div class="field"><label>Email</label><input id="u-email" type="email" placeholder="Ваш email"></div>' : '';
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h2>${title}</h2><p class="sub">${sub}</p>
    <div id="auth-alert"></div>
    <div class="field"><label>Логин</label><input id="u-username" placeholder="Ваш логин"></div>
    ${emailField}
    <div class="field"><label>Пароль</label><input id="u-password" type="password" placeholder="Ваш пароль"></div>
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
      box.innerHTML = alertBox('Успешно! Перенаправление...', 'ok');
      setTimeout(() => location.hash = '#/dashboard', 600);
    } catch (e) {
      if (e.needVerify) { verifyPage(null, e.token, null, e.emailSent); return; }
      box.innerHTML = alertBox(e.error || 'Ошибка');
    }
  };
  document.getElementById('u-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-submit').click(); });
}

function verifyPage(sentCode, tempToken, tempUser, emailSent) {
  const hint = emailSent === false ? 'Не удалось отправить письмо. Попробуйте позже.' : 'Код отправлен на вашу почту';
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h2>Подтверждение email</h2><p class="sub">${hint}</p>
    <div id="verify-alert"></div>
    <div class="field"><label>Код подтверждения</label><input id="u-code" placeholder="6-значный код"></div>
    <button class="btn btn-pink btn-block" id="verify-submit">Подтвердить</button>
    <div class="auth-switch"><a id="resend-code">Отправить код снова</a></div>
  </div></div>`;
  if (tempToken) localStorage.setItem('nova_token', tempToken);
  document.getElementById('verify-submit').onclick = async () => {
    const code = document.getElementById('u-code').value.trim();
    const box = document.getElementById('verify-alert');
    try {
      const data = await api('/api/verify', { method: 'POST', body: JSON.stringify({ code }) });
      saveAuth(data.token, data.user);
      box.innerHTML = alertBox('Email подтверждён! Перенаправление...', 'ok');
      setTimeout(() => location.hash = '#/dashboard', 600);
    } catch (e) {
      box.innerHTML = alertBox(e.error || 'Неверный код');
    }
  };
  const resend = document.getElementById('resend-code');
  if (resend) resend.onclick = async () => {
    try { await api('/api/resend', { method: 'POST' }); } catch {}
  };
}

// ===== ЛИЧНЫЙ КАБИНЕТ =====
async function dashboardPage() {
  await refreshMe();
  if (!me) return;
  const lic = me.license;
  let status, statusClass, meta;
  if (lic && lic.active) {
    if (lic.type === 'lifetime') { status = 'Активна (Навсегда)'; statusClass = 'active'; meta = 'Лицензия без ограничения срока'; }
    else if (lic.expiresAt > Date.now()) {
      const days = Math.ceil((lic.expiresAt - Date.now()) / 86400000);
      status = 'Активна'; statusClass = 'active'; meta = `Осталось: ${days} дн. · до ${new Date(lic.expiresAt).toLocaleDateString('ru-RU')}`;
    } else { status = 'Истекла'; statusClass = 'inactive'; meta = 'Купите подписку для продолжения'; }
  } else { status = 'Нет лицензии'; statusClass = 'inactive'; meta = 'Купите тариф на странице цен'; }

  const roleTag = me.role === 'owner' ? '<span class="tag tag-owner">Owner</span>'
    : me.role === 'admin' ? '<span class="tag tag-admin">Admin</span>' : '<span class="tag tag-user">User</span>';

  app.innerHTML = `<div class="dash">
    <h1>Привет, ${me.username} ${roleTag}</h1>
    <div class="dash-grid">
      <div class="dcard"><h3>Лицензия</h3><div class="big ${statusClass}">${status}</div><div class="meta">${meta}</div></div>
      <div class="dcard"><h3>Аккаунт</h3><div class="big" style="font-size:20px">${me.username}</div><div class="meta">Роль: ${me.role} · ID: ${me.id}</div></div>
    </div>
    <div class="dcard">
      <h3>Действия</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px">
        <a href="#/pricing" class="btn btn-pink">Купить / продлить</a>
        <a href="/api/download/launcher" class="btn btn-green">⬇ Скачать лаунчер</a>
        ${me.role === 'owner' || me.role === 'admin' ? '<a href="#/admin" class="btn btn-ghost">Админ-панель</a>' : ''}
      </div>
    </div>
    <div class="dcard" style="margin-top:18px">
      <h3>Мои заказы</h3>
      <div id="my-orders" style="margin-top:10px"></div>
    </div>
  </div>`;
  loadMyOrders();
}

async function loadMyOrders() {
  try {
    const orders = await api('/api/orders');
    const el = document.getElementById('my-orders');
    if (!orders.length) { el.innerHTML = '<p style="color:#666;font-size:14px">Заказов пока нет.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Тариф</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr></thead><tbody>${orders.map(o => {
      const tag = `<span class="tag tag-${o.status.replace('_','')}">${({pending_payment:'Ожидает оплаты',waiting_approval:'На проверке',approved:'Активна',rejected:'Отклонена'})[o.status]}</span>`;
      return `<tr><td>${o.planName}</td><td>${o.amountPayable} ${o.currency}</td><td>${tag}</td><td>${new Date(o.createdAt).toLocaleDateString('ru-RU')}</td></tr>`;
    }).join('')}</tbody></table>`;
  } catch {}
}

// ===== ЧЕКАУТ =====
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

  const curLabel = c => c === 'RUB' ? '₽' : c === 'KZT' ? '₸' : 'грн';
  const curFlag = c => c === 'RUB' ? '🇷🇺' : c === 'KZT' ? '🇰🇿' : '🇺🇦';
  const basePrice = (pid, cur) => {
    const p = plans.find(x => x.id === pid);
    return cur === 'RUB' ? p.priceRub : cur === 'KZT' ? p.priceKzt : p.priceUah;
  };
  const fmt = (val, cur) => cur === 'KZT' ? Math.round(val) + ' ₸' : val + ' ' + curLabel(cur);

  app.innerHTML = `<div class="checkout">
    <h1 style="font-size:28px;margin-bottom:6px">${method === 'card' ? 'Оплата картой' : method === 'card2card' ? 'Перевод на карту (Mono)' : method === 'crypto' ? 'Оплата USDT' : 'Оплата через реселлера'}</h1>
    <p style="color:#888;margin-bottom:20px">Тариф: <b style="color:#fff">${plan.name}</b></p>
    <div class="co-step"><h3>1. Тариф</h3>
      <select id="plan-select" style="width:100%;padding:12px;border-radius:10px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:15px">
        ${plans.map(p => `<option value="${p.id}" ${p.id===planId?'selected':''}>${p.name} — ${p.priceUah} грн / ${p.priceRub} ₽</option>`).join('')}
      </select>
    </div>
    <div class="co-step"><h3>2. Промокод</h3>
      <div style="display:flex;gap:10px">
        <input id="promo-input" placeholder="Например: Release" style="flex:1;padding:12px 16px;border-radius:10px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:15px;outline:none">
        <button class="btn btn-ghost" id="promo-apply">Применить</button>
      </div>
      <div id="promo-msg" style="margin-top:10px;font-size:14px"></div>
    </div>
    <div class="co-step"><h3>3. Валюта ${method==='card' ? '(автоконвертация)' : ''}</h3>
      <div class="pay-row" style="flex-wrap:wrap">
        <div class="pay-opt active" data-cur="UAH">${curFlag('UAH')} Гривны</div>
        <div class="pay-opt" data-cur="RUB">${curFlag('RUB')} Рубли</div>
        <div class="pay-opt" data-cur="KZT">${curFlag('KZT')} Тенге</div>
      </div>
    </div>
    <div class="co-step"><h3>4. К оплате</h3>
      <div id="amount-display" class="amount-box">${fmt(plan.priceUah, 'UAH')}</div>
      <div id="pay-area"></div>
      <div id="co-alert" style="margin-top:14px"></div>
    </div>
  </div>`;

  let discounted = null;
  const updateAmount = () => {
    const pid = document.getElementById('plan-select').value;
    const val = discounted !== null ? discounted : basePrice(pid, currency);
    document.getElementById('amount-display').textContent = fmt(val, currency);
    renderPayArea();
  };

  function renderPayArea() {
    const area = document.getElementById('pay-area');
    const pid = document.getElementById('plan-select').value;
    const val = discounted !== null ? discounted : basePrice(pid, currency);
    const sel = plans.find(p => p.id === pid);
    const cardVal = discounted !== null ? (discounted / (cfg.usdRates[currency]||cfg.usdRates.UAH) * cfg.usdRates.UAH) : basePrice(pid, 'UAH');
    const buildMsg = () => `🛒 Заказ Nova Client\nЛогин: ${me.username}\nТариф: ${sel.name}\nСумма: ${fmt(val, currency)}${promoCode ? '\nПромокод: ' + promoCode : ''}\nГотов оплатить, выдайте лицензию пожалуйста`;
    if (method === 'card') {
      if (cfg.paymentProvider === 'paypal' && cfg.paypalClientId) {
        area.innerHTML = `<div id="paypal-container" style="margin-top:10px"></div>`;
        renderPaypal(cfg.paypalClientId, val, currency, sel.name);
      } else {
        area.innerHTML = `<div class="card-box" style="text-align:center">
          <div class="lbl">Оплата картой не подключена</div>
          <div style="font-size:14px;color:#ccc;margin:10px 0 16px">Используйте оплату криптой (USDT) или через реселлера.</div>
          <a href="#/purchase?plan=${pid}" class="btn btn-ghost">← Выбрать другой способ</a>
        </div>`;
      }
    } else if (method === 'card2card') {
      const uahAmount = Math.round(cardVal * 100) / 100;
      area.innerHTML = `
        <div class="card-box" style="text-align:center">
          <div class="lbl">Перевод на карту (Mono, Украина)</div>
          <div class="amount-box" style="font-size:34px;color:var(--g);margin:8px 0">${uahAmount} грн</div>
          <div style="font-size:13px;color:#888;margin-bottom:14px">Оплата в гривнах. Для россиян — конвертация через ТГ.</div>
          <div class="lbl">Номер карты</div>
          <div id="card-num" style="font-family:Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:2px;cursor:pointer;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;margin:6px 0 14px;border:1px solid rgba(255,255,255,0.1)">${cfg.cardNumber}</div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-green" id="copy-card">📋 Копировать карту</button>
            <button class="btn btn-ghost" id="copy-amt2">Копировать сумму</button>
          </div>
          <div style="font-size:12px;color:#999;margin-top:16px;line-height:1.5">Сделайте перевод на карту Mono, затем отправьте подтверждение в Telegram — лицензию выдадут после проверки.</div>
          <a href="https://t.me/${cfg.telegram}?text=${encodeURIComponent('🛒 Оплата Nova Client картой\nЛогин: ' + me.username + '\nТариф: ' + sel.name + '\nСумма: ' + uahAmount + ' грн\nПеревёл на карту ' + cfg.cardNumber + ', жду лицензию')}" target="_blank" class="btn btn-pink" style="margin-top:12px;font-size:15px">💬 Отправить подтверждение в Telegram</a>
        </div>`;
      document.getElementById('copy-card').onclick = () => { navigator.clipboard.writeText(cfg.cardNumber.replace(/\s/g,'')); const b = document.getElementById('copy-card'); const t = b.textContent; b.textContent = '✓ Скопировано!'; setTimeout(() => b.textContent = t, 1500); };
      document.getElementById('copy-amt2').onclick = () => { navigator.clipboard.writeText(String(val)); const b = document.getElementById('copy-amt2'); const t = b.textContent; b.textContent = '✓ Скопировано!'; setTimeout(() => b.textContent = t, 1500); };
    } else if (method === 'crypto') {
      const usdtAmount = (val / (cfg.usdRates[currency] || cfg.usdRates.UAH)).toFixed(2);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('tron:' + cfg.usdtWallet)}`;
      area.innerHTML = `
        <div class="card-box" style="text-align:center">
          <div class="lbl">Оплата USDT · сеть ${cfg.usdtNetwork}</div>
          <div class="amount-box" style="font-size:36px;color:var(--g);margin:8px 0">${usdtAmount} <span style="font-size:22px">USDT</span></div>
          <div style="font-size:13px;color:#888;margin-bottom:14px">≈ ${fmt(val, currency)} · автоконвертация по курсу 1 USDT = $1</div>
          <img src="${qrUrl}" alt="QR" style="width:180px;height:180px;border-radius:12px;margin:0 auto 14px;display:block;background:#fff;padding:8px">
          <div class="lbl">Адрес кошелька (TRC20)</div>
          <div id="usdt-addr" style="font-family:Consolas,monospace;font-size:13px;word-break:break-all;cursor:pointer;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;margin:6px 0 14px;border:1px solid rgba(255,255,255,0.1)">${cfg.usdtWallet}</div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-green" id="copy-addr">📋 Копировать адрес</button>
            <button class="btn btn-ghost" id="copy-amt">Копировать сумму</button>
          </div>
          <div style="font-size:12px;color:#999;margin-top:16px;line-height:1.5">⚠ Отправляйте <b>только USDT</b> в сети <b>TRC20</b>. После перевода отправьте TXID (хэш транзакции) в Telegram — лицензию выдадут после подтверждения сети.</div>
          <a href="https://t.me/${cfg.telegram}?text=${encodeURIComponent('🛒 Оплата Nova Client USDT\nЛогин: ' + me.username + '\nТариф: ' + sel.name + '\nСумма: ' + usdtAmount + ' USDT\nTXID: <вставьте хэш транзакции>')}" target="_blank" class="btn btn-pink" style="margin-top:12px;font-size:15px">💬 Отправить TXID в Telegram</a>
        </div>`;
      document.getElementById('copy-addr').onclick = () => { navigator.clipboard.writeText(cfg.usdtWallet); const b = document.getElementById('copy-addr'); const t = b.textContent; b.textContent = '✓ Скопировано!'; setTimeout(() => b.textContent = t, 1500); };
      document.getElementById('copy-amt').onclick = () => { navigator.clipboard.writeText(usdtAmount); const b = document.getElementById('copy-amt'); const t = b.textContent; b.textContent = '✓ Скопировано!'; setTimeout(() => b.textContent = t, 1500); };
    } else {
      area.innerHTML = `<div class="card-box" style="text-align:center">
        <div class="lbl">Оплата через реселлера в Telegram</div>
        <div style="font-size:14px;color:#ccc;margin:10px 0 16px">Нажмите кнопку — откроется чат с готовым сообщением. После оплаты лицензию выдадут вручную.</div>
        <a id="tg-link" href="https://t.me/${cfg.telegram}" target="_blank" class="btn btn-pink" style="font-size:16px;padding:13px 28px;text-decoration:none">💬 Написать @${cfg.telegram}</a>
        <div style="margin-top:12px"><button class="btn btn-ghost" id="copy-msg" style="font-size:13px">Скопировать сообщение</button></div>
      </div>`;
      document.getElementById('tg-link').href = `https://t.me/${cfg.telegram}?text=${encodeURIComponent(buildMsg())}`;
      document.getElementById('copy-msg').onclick = () => { navigator.clipboard.writeText(buildMsg()); const b = document.getElementById('copy-msg'); const t = b.textContent; b.textContent = '✓ Скопировано!'; setTimeout(() => b.textContent = t, 1500); };
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
        purchase_units: [{ amount: { value: String(amount), currency_code: cur === 'RUB' ? 'RUB' : cur === 'KZT' ? 'KZT' : 'UAH' }, description: 'Nova Client — ' + name }]
      }),
      onApprove: async (_, actions) => {
        await actions.order.capture();
        document.getElementById('co-alert').innerHTML = alertBox('Оплата прошла! Заказ обрабатывается.', 'ok');
        try { await api('/api/payment/create', { method: 'POST', body: JSON.stringify({ planId: document.getElementById('plan-select').value, currency, promoCode }) }); } catch {}
        setTimeout(() => location.hash = '#/dashboard', 2000);
      }
    }).render('#paypal-container');
  }

  document.getElementById('plan-select').onchange = () => { promoCode = ''; discounted = null; document.getElementById('promo-msg').innerHTML = ''; updateAmount(); };
  document.querySelectorAll('.pay-opt').forEach(o => o.onclick = () => { document.querySelectorAll('.pay-opt').forEach(x => x.classList.remove('active')); o.classList.add('active'); currency = o.dataset.cur; updateAmount(); });

  document.getElementById('promo-apply').onclick = async () => {
    const code = document.getElementById('promo-input').value.trim();
    const msg = document.getElementById('promo-msg');
    if (!code) { msg.innerHTML = ''; promoCode = ''; discounted = null; updateAmount(); return; }
    try {
      const r = await api('/api/promo/validate', { method: 'POST', body: JSON.stringify({ code, planId: document.getElementById('plan-select').value, currency }) });
      promoCode = code; discounted = r.discounted;
      msg.innerHTML = `<span style="color:#4ade80">✓ ${r.description}: −${r.discountPercent}% → ${fmt(r.discounted, currency)}</span>`;
      updateAmount();
    } catch (e) { msg.innerHTML = `<span style="color:#f87171">${e.error}</span>`; promoCode = ''; discounted = null; updateAmount(); }
  };

  updateAmount();
}

// ===== АДМИНКА =====
async function adminPage() {
  await refreshMe();
  app.innerHTML = `<div class="admin">
    <h1>Админ-панель</h1><p class="sub">Заказы на модерации и управление пользователями</p>
    <div class="dcard" style="margin-bottom:18px"><h3>Заказы (ожидают проверки)</h3><div id="admin-orders" style="margin-top:12px"></div></div>
    <div class="dcard"><h3>Пользователи</h3><div id="admin-users" style="margin-top:12px"></div></div>
  </div>`;
  try {
    const orders = await api('/api/admin/orders');
    const ods = orders.filter(o => o.status === 'waiting_approval' || o.status === 'pending_payment');
    const all = orders;
    document.getElementById('admin-orders').innerHTML = all.length ? `<table><thead><tr><th>ID</th><th>Юзер</th><th>Тариф</th><th>Сумма</th><th>Промо</th><th>Статус</th><th>Действия</th></tr></thead><tbody>${all.map(o => {
      const u = o.userId; const tag = `<span class="tag tag-${o.status.replace('_','')}">${o.status}</span>`;
      const act = o.status === 'waiting_approval' ? `<button class="mini-btn mb-green" onclick="appr(${o.id})">Одобрить</button><button class="mini-btn mb-red" onclick="rej(${o.id})">Отклонить</button>` : '';
      return `<tr><td>#${o.id}</td><td>${o.userId}</td><td>${o.planName}</td><td>${o.amountPayable} ${o.currency}</td><td>${o.promoCode||'—'}</td><td>${tag}</td><td>${act}</td></tr>`;
    }).join('')}</tbody></table>` : '<p style="color:#666">Заказов нет.</p>';

    const users = await api('/api/admin/users');
    const grantOpts = '<option value="">— выдать —</option>' + ['month','halfyear','lifetime'].map(id => {
      const p = ({month:'1 месяц',halfyear:'6 месяцев',lifetime:'Навсегда'})[id];
      return `<option value="${id}">${p}</option>`;
    }).join('');
    document.getElementById('admin-users').innerHTML = `<table><thead><tr><th>ID</th><th>Логин</th><th>Роль</th><th>Лицензия</th><th>HWID</th><th>Выдать подписку</th><th>Действия</th></tr></thead><tbody>${users.map(u => {
      const tag = u.role === 'owner' ? '<span class="tag tag-owner">Owner</span>' : u.role === 'admin' ? '<span class="tag tag-admin">Admin</span>' : '<span class="tag tag-user">User</span>';
      const lic = u.license && u.license.active ? (u.license.type === 'lifetime' ? 'Life ✓' : 'до ' + new Date(u.license.expiresAt).toLocaleDateString('ru-RU')) : '<span style="color:#666">нет</span>';
      const hw = u.hwid ? `<span style="font-family:Consolas;font-size:11px">${u.hwid.substring(0,16)}…</span>` : '<span style="color:#666">—</span>';
      const grant = `<select class="grant-sel" data-uid="${u.id}" style="padding:5px 8px;border-radius:7px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:12px">${grantOpts}</select>`;
      const reset = u.hwid ? `<button class="mini-btn mb-red" onclick="resethwid(${u.id})">Сброс HWID</button>` : '';
      const revoke = u.license && u.license.active ? `<button class="mini-btn mb-red" onclick="revoke(${u.id})">Снять</button>` : '';
      return `<tr><td>${u.id}</td><td>${u.username}</td><td>${tag}</td><td>${lic}</td><td>${hw}</td><td>${grant}</td><td>${reset}${revoke}</td></tr>`;
    }).join('')}</tbody></table>`;
    document.querySelectorAll('.grant-sel').forEach(s => s.onchange = async (e) => {
      const pid = e.target.value; if (!pid) return;
      if (!confirm('Выдать тариф «' + e.target.options[e.target.selectedIndex].text + '» юзеру #' + e.target.dataset.uid + '?')) { e.target.value = ''; return; }
      try { await api('/api/admin/user/' + e.target.dataset.uid + '/grant', { method: 'POST', body: JSON.stringify({ planId: pid }) }); adminPage(); }
      catch (err) { alert(err.error); e.target.value = ''; }
    });
  } catch (e) { app.innerHTML += alertBox(e.error || 'Ошибка загрузки'); }
}

window.appr = async (id) => { try { await api('/api/admin/order/' + id + '/approve', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.rej = async (id) => { try { await api('/api/admin/order/' + id + '/reject', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.resethwid = async (id) => { if (!confirm('Сбросить HWID-привязку этого аккаунта?')) return; try { await api('/api/admin/user/' + id + '/reset-hwid', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };
window.revoke = async (id) => { if (!confirm('Снять лицензию у этого юзера?')) return; try { await api('/api/admin/user/' + id + '/revoke', { method: 'POST' }); adminPage(); } catch (e) { alert(e.error); } };

// ===== INIT =====
window.addEventListener('hashchange', router);
function bootstrap() { renderNav(); refreshMe().finally(router); }
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();
