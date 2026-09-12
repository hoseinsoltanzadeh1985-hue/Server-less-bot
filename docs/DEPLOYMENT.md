# Deployment checklist — Qoqnoos Serverless

## 1. قبل از push

- `BOT_OWNER_ID` را در `lib/config.js` تنظیم کن.
- هیچ Token/Secretی در source نباشد.
- `node_modules` و `.tgcloud/credentials` را commit نکن.

## 2. بررسی محلی

```bash
node --check schema.js
for f in handlers/*.js lib/*.js; do node --check "$f" || exit 1; done
npm run status
npm run diff
```

## 3. Database

پس از بررسی diff:

```bash
npm run migrate
```

## 4. Code

```bash
npm run push
```

## 5. Webhook

پس از فعال شدن handlerها، وضعیت webhook را از طریق ابزار Serverless بررسی کن. polling را برای همین Bot Token اجرا نکن.

## 6. Games

پوشه `games/` را روی HTTPS static hosting منتشر کن. سپس URLهای واقعی را در `lib/games.js` تنظیم و دوباره push کن.

## 7. Voice Assistant

این repository در وضعیت فعلی voice-note STT/AI/TTS یا live voice-chat worker ندارد. قبل از افزودن آن، مکانیزم رسمی Secret و مسیر media runtime باید جداگانه تأیید شود.
