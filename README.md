# 🔥 ققنوس | Qoqnoos Bot — PediGuardian Serverless Enterprise

**هوشمند • امن • همیشه آماده**

ققنوس یک Bot مستقل Telegram Serverless است و **Simorgh / PediGuardian 4.7.1** یک Bot کاملاً مجزا است. این دو باید Token، Update pipeline، Webhook/Polling و runtime جدا داشته باشند.

> یک Bot Token نباید هم‌زمان توسط Java polling و Serverless webhook مصرف شود. چون ققنوس و سیمرغ دو Bot جدا هستند، می‌توانند هم‌زمان بدون تداخل زیرساختی اجرا شوند.

## ✨ قابلیت‌ها

### 🛡 مدیریت و امنیت
- RBAC: `RESTRICTED`, `MEMBER`, `HELPER`, `MODERATOR`, `ADMIN`, `SENIOR_ADMIN`, `GROUP_OWNER`, `BOT_OWNER`
- Policy مستقل برای هر گروه و Role
- بررسی Role واقعی Telegram قبل از عملیات حساس
- بررسی Native Bot Permissions
- Target Hierarchy
- Anti-Spam / Anti-Link / Anti-Raid
- Lock / Unlock / Lock All / Unlock All
- Badword / Filter
- Warn / Mute / Ban / Kick / Delete / Pin
- Admin و Permission management

### 📊 Audit و پنل
- Audit Log
- Security Audit Summary
- Dynamic Panel بر اساس Role + Permission
- گزارش رویدادهای مدیریتی

### 🧠 AI
- AI Gateway با secret handling امن و fail-closed
- Memory per user/chat
- TTL برای Memory
- Personality در scope global یا chat
- `/memory`
- `/personality`

### 🧹 پاک‌سازی حافظه هر ۲۴ ساعت
Serverless کرون دائمی ندارد؛ بنابراین cleanup به صورت **lazy maintenance** هنگام دریافت ترافیک اجرا می‌شود. زمان آخرین اجرا در DB ثبت می‌شود؛ اگر حداقل ۲۴ ساعت گذشته باشد، فقط Memoryهای منقضی‌شده حذف می‌شوند.

- Memory فعال حذف نمی‌شود.
- Memory دارای TTL پس از انقضا حذف می‌شود.
- maintenance بیش از یک بار در هر ۲۴ ساعت اجرا نمی‌شود.

### 🎮 بازی و اقتصاد
- Air Raider
- Backgammon
- Voice Wheel
- WebApp score ingestion
- XP / Level / Coins
- Leaderboard

بازی‌های HTML باید روی Static HTTPS Host معتبر باشند؛ Serverless Backend به‌تنهایی HTML بازی را Host نمی‌کند.

### ⚡ Enterprise Job Queue
- Durable SQLite queue
- `PENDING → RUNNING → DONE / FAILED`
- Claim / Complete / Fail
- Retry scheduling

Queue فعلی هسته پایدار Queue است و Dispatcherهای تخصصی می‌توانند برای job typeهای واقعی تکمیل شوند.

### 🎟 Group / Trial
- Group state مستقل
- Trial 15 روزه
- Extend
- Groups

## 🏗 معماری همزیستی

```text
                         Telegram
                            │
             ┌──────────────┴──────────────┐
             │                             │
       🦅 Simorgh 4.7.1              🔥 Qoqnoos Bot
          Java / JAR                 Telegram Serverless
             │                             │
          Supabase                    SQLite Runtime
             │                             │
          مستقل                       مستقل
```

### ممنوعیت‌های معماری
- Token مشترک ممنوع
- Polling و Webhook برای یک Bot مشترک ممنوع
- Handler مشترک ممنوع
- state مشترک ناایمن ممنوع
- Secret در GitHub ممنوع

سیمرغ 4.7.1 می‌تواند بدون تغییر به کار خود ادامه دهد و ققنوس مستقل توسعه و تست شود.

## 📁 ساختار

```text
handlers/
  message.js
  callback_query.js
  chat_member.js
  my_chat_member.js
lib/
  config.js
  util.js
  store.js
  telegram.js
  rbac.js
  security.js
  panel.js
  ai.js
  games.js
  moderation.js
  enterprise.js
schema.js
```

## 🧩 پنج Enterprise Upgrade

1. **Policy-based RBAC** با policy مستقل برای هر گروه و role
2. **Durable Event/Job Queue** با claim/complete/fail
3. **Security Audit** و خلاصه رویدادها
4. **AI Memory + Personality** با TTL و scope
5. **Game Economy** شامل XP، Level، Coins و Leaderboard

## 🔐 Secrets
هیچ Bot Token یا API Key در GitHub commit نمی‌شود. Secretها فقط از مسیر رسمی Telegram Serverless/CLI یا مکانیزم امن Secret محیط اجرا تنظیم شوند.

## 🚀 Deployment
1. Serverless را برای **Bot ققنوس** فعال کنید.
2. Schema را migrate کنید.
3. کد را push کنید.
4. Handler/Webhook را sync کنید.
5. Command، RBAC، Memory، Queue و Game flow را end-to-end تست کنید.

## 🧪 Acceptance Tests
- [ ] RBAC با وضعیت واقعی Telegram
- [ ] حذف/تنزل Admin باعث حذف دسترسی مدیریتی شود
- [ ] Native Bot Permission قبل از عملیات حساس بررسی شود
- [ ] Callback و Commandها permission/rate-limit داشته باشند
- [ ] Memory منقضی‌شده در چرخه ۲۴ ساعته cleanup حذف شود
- [ ] Memory فعال حذف نشود
- [ ] Queue دوباره‌کاری نکند
- [ ] XP/Level/Leaderboard برای هر گروه جدا باشد
- [ ] بازی‌ها از HTTPS معتبر باز شوند
- [ ] Simorgh و Qoqnoos هیچ Token/Webhook/Polling مشترکی نداشته باشند

## 🏷 هویت
**نام رسمی:** `ققنوس | Qoqnoos Bot`

**شعار:** «از خاکستر، یک ربات قدرتمندتر.»

## 🔧 وضعیت
این پروژه مستقل از deployment فعلی Simorgh 4.7.1 نگهداری می‌شود. قبل از Production باید migration، permission checks، callback security، memory cleanup، queue execution و بازی‌های HTTPS به‌صورت end-to-end تست شوند.
