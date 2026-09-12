# Server-less-bot — PediGuardian Serverless Enterprise

PediGuardian capability rewrite for Telegram Serverless.

Release: 5.1 Enterprise

The repository is intentionally independent from the existing Java/Simorgh deployment.

## 5 Enterprise upgrades
1. Policy-based RBAC with per-group role policies and Telegram-native role checks.
2. Durable SQLite job queue with claim/complete/fail semantics for serverless workloads.
3. Security audit summary and audit-oriented panel surface.
4. AI memory with TTL plus per-scope personality profiles.
5. Game economy with XP, levels, coins and leaderboard storage.

A complete source archive is included under `releases/PediGuardian-Serverless-5.1-Enterprise.zip`.

Important: before deployment, configure `BOT_OWNER_ID` in `lib/config.js`, then run the Telegram Serverless migration/push flow. API keys and bot tokens are never committed to this repository.
