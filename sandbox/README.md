# Day 1 Sandbox — Account API + Loyalty Points Redemption

Zero dependencies — plain Node `http` module, no `npm install` required.

## Setup

1. `node server.js` (default port 3000, override with `PORT=<n>`)
2. Confirm `curl http://localhost:3000/api/health` returns `{"status":"ok"}`

Optional: from this folder, `docker build -t kerk-sandbox . && docker run -p 3000:3000 kerk-sandbox`.

## Seeded accounts

| Email | Password | State | Points |
|---|---|---|---|
| alice@sandbox.local | Passw0rd! | active | 500 |
| bob@sandbox.local | Passw0rd! | locked | 200 |
| carol@sandbox.local | Passw0rd! | active, zero balance | 0 |

Seeded rewards: `r1` $5 gift card (100 pts), `r2` $25 gift card (500 pts), `r3` branded hoodie (800 pts).

## Endpoints

- `GET /api/health`
- `POST /api/auth/login` — `{ "email": "...", "password": "..." }`
- `GET /api/rewards`
- `GET /api/rewards/:id`
- `POST /api/redeem` — `{ "rewardId": "..." }` (requires `Authorization: Bearer <token>` from login)
- `GET /api/redemption-history/:userId` (requires `Authorization: Bearer <token>` from login)
- `POST /api/admin/toggle-outage` — `{ "enabled": true|false }`

Questions on the sandbox itself (not the exercises) go in your daily EOD email.
