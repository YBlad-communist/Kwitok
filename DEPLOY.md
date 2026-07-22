# Деплой Квиток Mobile

## 1. Бэкенд (Railway или Render)

### Railway (рекомендуется)

```bash
# Установи Railway CLI
npm i -g @railway/cli

# В корне проекта
railway login
railway init

# Настрой переменные в Railway Dashboard:
railway env set DATABASE_URL=postgresql://...
railway env set JWT_ACCESS_SECRET=<random-64-chars>
railway env set JWT_REFRESH_SECRET=<random-64-chars>
railway env set NORDIGEN_SECRET_ID=<из Nordigen>
railway env set NORDIGEN_SECRET_KEY=<из Nordigen>
railway env set REVENUECAT_API_KEY=<из RevenueCat>
railway env set REVENUECAT_WEBHOOK_SECRET=<из RevenueCat>
railway env set RESEND_API_KEY=<из Resend>
railway env set EXPO_ACCESS_TOKEN=<из Expo>
railway env set FRONTEND_REDIRECT_URL=kwitok://callback

# Создай PostgreSQL
railway add postgresql

# Задеплой
railway up

# Примени миграции
railway run npx prisma migrate deploy
```

### Render

1. Создай **PostgreSQL** через Render Dashboard
2. Создай **Web Service**, подключи репозиторий GitHub
3. Root Directory: `apps/api`
4. Build Command: `npm install && npx prisma generate && npx tsc`
5. Start Command: `npx prisma migrate deploy && node dist/index.js`
6. Добавь все переменные окружения (см. список выше)

### Переменные окружения для прода

```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<генерация: openssl rand -hex 64>
JWT_REFRESH_SECRET=<генерация: openssl rand -hex 64>
NORDIGEN_SECRET_ID=
NORDIGEN_SECRET_KEY=
REVENUECAT_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
RESEND_API_KEY=
EXPO_ACCESS_TOKEN=
FRONTEND_REDIRECT_URL=kwitok://callback
```

---

## 2. Expo (iOS + Android) через EAS Build

### Установка

```bash
npm install -g eas-cli
eas login
```

### Настройка

```bash
cd apps/mobile

# Настрой проект для EAS Build
eas build:configure

# Создай файл eas.json:
```

### eas.json (apps/mobile)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {}
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@appleid.com", "ascAppId": "..." },
      "android": { "track": "internal" }
    }
  }
}
```

### Сборка

```bash
# Для тестирования (APK/IPA):
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Для прода:
eas build --platform all --profile production
```

### Expo переменные окружения

Установи в **Expo Dashboard** → Project → Secrets:

```
EXPO_PUBLIC_API_URL=https://kwitok-api.railway.app/api
```

Или через `eas secret:create`:

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value https://kwitok-api.railway.app/api
```

---

## 3. GoCardless (Nordigen)

1. Зарегистрируйся на https://gocardless.com/bank-account-data/
2. Получи **Secret ID** и **Secret Key**
3. Укажи в переменных окружения бэкенда

---

## 4. RevenueCat

1. Создай проект в RevenueCat
2. Создай продукты: `pro_monthly` (€6.99), `pro_yearly` (€59.99)
3. Получи API ключи
4. Настрой Webhook в RevenueCat → Integrations → Custom Webhook → URL твоего бэкенда: `https://kwitok-api.railway.app/api/billing/webhook`
5. Добавь `REVENUECAT_API_KEY` и `REVENUECAT_WEBHOOK_SECRET` в бэкенд

---

## 5. Push-уведомления

1. В **Expo Application Services** получи **Expo Access Token**
2. Укажи `EXPO_ACCESS_TOKEN` в бэкенде
3. На мобильном устройстве токен регистрируется автоматически при первом запуске

---

## 6. App Store / Google Play чеклист

- [ ] Политика конфиденциальности — опубликовать на GitHub Pages или отдельном сайте, указать ссылку в App Store Connect / Google Play Console
- [ ] Экран удаления аккаунта есть (Settings → Delete Account)
- [ ] Все подписки через RevenueCat, не через Stripe
- [ ] Экран объяснения доступа к банковским данным перед Open Banking consent
- [ ] TestFlight / Internal Testing — собрать через `eas build` и загрузить через App Store Connect / Google Play Console

---

## Быстрый старт локально

```bash
# 1. Клонировать
git clone <repo> && cd kwitok

# 2. API
cd apps/api
cp .env.example .env  # заполнить
npm install
npx prisma migrate dev
npm run dev

# 3. Mobile
cd apps/mobile
cp .env.example .env  # EXPO_PUBLIC_API_URL=http://localhost:4000/api
npm install
npx expo start
```
