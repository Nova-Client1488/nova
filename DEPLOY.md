# Nova Web — деплой на Deno Deploy (бесплатно, без sleep, без карты)

## Что получишь
- Сайт на постоянном URL `nova-web.deno.dev` (или свой домен)
- Не спит, не ложится, бесплатно навсегда
- БД: Deno KV (встроенная, persistent, бесплатно)
- Без карты/адреса — только GitHub

## Шаг 1 — Создать GitHub repo
1. Зайди на https://github.com → New repository
2. Name: `nova-web` → Public → Create
3. Загрузи все файлы из `C:\Users\rudoy\Desktop\Nova Web` (кроме `node_modules/`, `db.json`, `package-lock.json`)
4. Нужные файлы: `server.deno.js`, `deno.json`, `public/` (index.html, style.css, app.js), `downloads/` (с nova-client.jar)

## Шаг 2 — Подключить Deno Deploy
1. Зайди на https://dash.deno.com → Sign in with GitHub
2. New Project → выбери repo `nova-web`
3. Entrypoint: `server.deno.js`
4. Deploy — получишь URL `nova-web.deno.dev`

## Шаг 3 — Активировать Deno KV
1. В dashboard Deno Deploy → твой project → KV
2. Create database → name `nova` → Connect
3. Deno KV автоматически persistent (данные не теряются)

## Шаг 4 — Настроить env vars
В dashboard → project → Settings → Environment Variables:
- `JWT_SECRET` = случайная строка (например `nova-CHANGE-2026-secret-xyz`)
- `PORT` = `8000` (Deno Deploy сам подставит, можно не указывать)

## Шаг 5 — Загрузить jar
1. В repo создай папку `downloads/`
2. Загрузи туда `nova-client.jar` (из `C:\Users\rudoy\Desktop\Nova Web\downloads\nova-client.jar`)
3. Commit → Deno Deploy автоматически пересоберёт

## Шаг 6 — Проверить
Открой `https://nova-web.deno.dev` — сайт работает.
Логин: `N1x` / `samturail` (Owner, lifetime)

## Обновление сайта
- Push в GitHub repo → Deno Deploy автоматически пересоберёт
- Или в dashboard → Deploy → Redeploy

## Обновление jar (когда выпускаешь обнову)
1. Собери новую jar: `gradlew build` (на твоём ПК)
2. Скопируй `nova-client-0.1.0.jar` → `downloads/nova-client.jar` в repo
3. В `server.deno.js` подними `CLIENT_VERSION` (например `'0.2.0'`)
4. Commit + push → Deno Deploy пересоберёт → юзеры получат "Обновить"

## Лаунчер
В лаунчере (main.js) поменяй API URL на `https://nova-web.deno.dev`:
```js
const API = 'https://nova-web.deno.dev';
```
Пересобери лаунчер.

## Управление
- Логи: dashboard → Logs
- Рестарт: dashboard → Deploy → Redeploy
- Env vars: dashboard → Settings → Environment Variables
