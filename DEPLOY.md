# Nova Web — деплой на Oracle Cloud (Always Free)

## Что получишь
- VM Oracle Cloud Always Free (AMD Ampere A1, 4 OCPU / 24GB RAM — бесплатно навсегда)
- Сайт Nova Client на постоянном IP (не спит, не ложится)
- URL: `http://VM_IP:3000`

## Шаг 1 — Создать аккаунт Oracle Cloud
1. Зайди на https://cloud.oracle.com → Sign Up
2. Верифицируй карту (снимут $1 и вернут — не спишут)
3. Подтверди email/телефон

## Шаг 2 — Создать VM
1. Console → Compute → Instances → Create Instance
2. Name: `nova-web`
3. Shape: **VM.Standard.A1.Flex** (Ampere) — 2 OCPU, 12 GB RAM (бесплатно)
4. Image: **Canonical Ubuntu 22.04**
5. SSH keys: Save private key (скачается)
6. Create

## Шаг 3 — Открыть порт 3000
1. Console → Networking → Virtual Cloud Networks → default VCN → Security Lists → Default Security List
2. Add Ingress Rule:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: `TCP`
   - Destination Port Range: `3000`
3. Save

## Шаг 4 — Залиться на VM
```bash
ssh -i path/to/private-key ubuntu@VM_PUBLIC_IP
```

## Шаг 5 — Запустить деплой
```bash
# Скачать deploy скрипт
curl -fsSL https://raw.githubusercontent.com/CHANGEME/nova-web/main/deploy.sh -o deploy.sh
# Или вручную (после git clone) — отредактируй GitHub URL в deploy.sh
sed -i 's/CHANGEME/YOUR_GITHUB_USER/g' deploy.sh
bash deploy.sh
```

Скрипт сам:
- Установит Node.js 20, PM2, git
- Склонирует проект
- Установит зависимости
- Запустит сайт через PM2 (авторестарт, автозапуск при загрузке)
- Откроет порт 3000 в iptables

## Шаг 6 — Проверить
Открой в браузере: `http://VM_PUBLIC_IP:3000`

## Управление
```bash
pm2 status              # статус
pm2 logs nova-web       # логи
pm2 restart nova-web    # рестарт
pm2 stop nova-web      # стоп
```

## MongoDB (опционально — persistent DB)
По умолчанию сайт использует `db.json` (файл). Если хочешь MongoDB Atlas:
1. Создай free cluster на https://mongodb.com/atlas
2. Получи connection string
3. В `/opt/nova-web/ecosystem.config.js` впиши `MONGODB_URI: 'mongodb+srv://...'`
4. `pm2 restart nova-web`

Без MongoDB — `db.json` работает на persistent volume VM Oracle (не теряется).

## Обновление сайта
```bash
cd /opt/nova-web
git pull
pm2 restart nova-web
```

## Важно
- В `deploy.sh` замени `CHANGEME` на свой GitHub username
- В `ecosystem.config.js` поменяй `JWT_SECRET` на случайную строку
- GitHub repo должен быть публичным (или добавь SSH deploy key)
