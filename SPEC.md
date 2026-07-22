# Квиток — техническое задание для Claude Code

Full-stack приложение-трекер подписок с триалом и платной Pro-подпиской.
Фронтенд-прототип интерфейса уже готов (React, компонент `Kvitok`, эстетика "чек/лента") — его нужно взять за основу дизайна и подключить к реальному бэкенду.

## Стек

- **Фронтенд:** React + Vite + Tailwind CSS + recharts + lucide-react
- **Бэкенд:** Node.js + Express (или Fastify) + TypeScript
- **База данных:** PostgreSQL + Prisma ORM
- **Авторизация:** email + пароль (bcrypt) + JWT в httpOnly cookie. Опционально: OAuth (Google) через passport.js на втором этапе
- **Платежи:** Stripe (Checkout + Billing + Customer Portal + Webhooks)
- **Email-уведомления:** Resend или SendGrid
- **Хостинг:** Railway или Render (бэкенд + Postgres), Vercel (фронтенд)
- **Планировщик задач:** node-cron или Railway Cron — для ежедневной проверки "скоро списание" и отправки писем

## Схема базы данных (Prisma)

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String
  createdAt         DateTime @default(now())

  stripeCustomerId       String?  @unique
  stripeSubscriptionId   String?
  subscriptionStatus     String?  // "trialing" | "active" | "past_due" | "canceled" | null
  trialEndsAt             DateTime?

  subscriptions     Subscription[]
}

model Subscription {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String
  price       Decimal
  currency    String   @default("EUR")
  cycle       String   // "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly"
  nextDate    DateTime
  category    String
  unused      Boolean  @default(false)
  createdAt   DateTime @default(now())
  cancelledAt DateTime?
}
```

## Бизнес-логика тарифов

- **Free:** до 5 активных подписок, без доступа к аналитике по категориям и подсказкам по экономии
- **Trial:** 14 дней полного доступа к Pro сразу после регистрации, без привязки карты. Хранится в `User.trialEndsAt`
- **Pro:** €4.99/мес или €39/год (сделать выбор периода на странице оплаты — годовая подписка даёт скидку ~35%, это стандартный приём для повышения LTV)
- После окончания триала, если карта не привязана — пользователь автоматически переводится на Free (не блокировать доступ полностью, просто скрыть Pro-фичи и включить лимит в 5 подписок; если у него уже больше 5 — не удалять лишние, просто запретить добавлять новые, пока не отпишет часть)

## API-эндпоинты

```
POST   /api/auth/register          { email, password }
POST   /api/auth/login             { email, password } -> httpOnly cookie
POST   /api/auth/logout
GET    /api/auth/me                -> текущий юзер + статус подписки

GET    /api/subscriptions          -> список подписок пользователя
POST   /api/subscriptions          -> создать (проверять лимит Free-тарифа на бэкенде, не только на фронте!)
PATCH  /api/subscriptions/:id      -> обновить (в т.ч. unused toggle)
DELETE /api/subscriptions/:id

GET    /api/billing/checkout-session   -> создать Stripe Checkout Session (monthly/yearly)
GET    /api/billing/portal-session     -> ссылка на Stripe Customer Portal (управление/отмена)
POST   /api/billing/webhook            -> обработка событий Stripe (см. ниже), raw body, проверка подписи
```

## Stripe: обязательные события вебхука

- `checkout.session.completed` → записать stripeCustomerId и stripeSubscriptionId пользователю
- `customer.subscription.updated` → синхронизировать subscriptionStatus
- `customer.subscription.deleted` → перевести пользователя на Free
- `invoice.payment_failed` → пометить subscriptionStatus = "past_due", отправить письмо с просьбой обновить карту

Важно: сумма из Stripe — источник правды по статусу подписки, фронт никогда не должен сам решать "isPro" — только читать это поле с бэкенда.

## Фоновая задача (cron, раз в день, например в 09:00 по таймзоне пользователя или UTC на старте)

1. Найти все Subscription, где `nextDate` через 1–3 дня → отправить email-напоминание
2. Найти всех User с `trialEndsAt` < сегодня и `stripeSubscriptionId == null` → перевести на Free (просто логическое поле, ничего не удалять)

## План работы (по шагам для Claude Code)

1. Инициализировать монорепо (`/apps/web`, `/apps/api`) или два отдельных репозитория
2. Поднять Postgres локально (Docker) + Prisma миграции по схеме выше
3. Реализовать auth (register/login/me) с JWT в httpOnly cookie
4. CRUD для Subscription с проверкой лимита Free-тарифа на бэкенде
5. Перенести готовый React-компонент "Квиток" (приложен отдельным файлом `kvitok-prototype.jsx`), подключить к реальному API вместо локального useState, добавить экран логина/регистрации
6. Подключить Stripe: Checkout Session, Customer Portal, вебхуки (тестировать через `stripe listen --forward-to`)
7. Подключить Resend/SendGrid и cron-задачу для уведомлений
8. Задеплоить: Railway/Render для API+DB, Vercel для фронта, настроить переменные окружения и Stripe в live-режиме

## Переменные окружения (api/.env)

```
DATABASE_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=
RESEND_API_KEY=
FRONTEND_URL=
```

## Что важно не упустить

- Лимиты и статус Pro всегда проверять на бэкенде, не доверять фронту
- Webhook endpoint должен принимать raw body (Stripe требует это для проверки подписи)
- При отмене подписки в Stripe Customer Portal — не удалять данные пользователя, просто менять статус
- GDPR: приложение ориентировано в том числе на пользователей из ЕС (Латвия) — предусмотреть удаление аккаунта и экспорт данных по запросу
