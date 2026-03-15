# Production Checklist

## Backend
- Set `CORS_ORIGINS` to your frontend domain(s), for example:
  - `CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com`
- Run behind Gunicorn (already configured in `render.yaml`).
- Keep `debug=False` (already set).
- Use HTTPS-only deployment for API and frontend.
- Protect SQLite access path or migrate to managed Postgres for multi-user production scale.

## Frontend
- Set `VITE_API_URL` to your deployed backend URL.
- Set `VITE_GOOGLE_CLIENT_ID` from Google Cloud OAuth credentials.
- In Google Cloud Console:
  - Add authorized JavaScript origins for your frontend URL.
  - Add authorized redirect domains/origins as required by GIS.

## Auth
- Google sign-in now uses account chooser (`prompt=select_account`) via Google Identity Services.
- Backend verifies Google access tokens against Google userinfo endpoint before creating sessions.
- Email/password auth now uses salted password hashing (`werkzeug.security`).

## Trading Feature
- Live Binance trading is guarded by:
  - `ALLOW_LIVE_TRADING=true` on backend
  - Optional test mode: `ALLOW_TESTNET_TRADING=true`
  - Explicit `confirm_live=true` per order
- Risk limits:
  - `MAX_ORDER_NOTIONAL_USDT` (per-order)
  - `MAX_DAILY_NOTIONAL_USDT` (per-user per day)
- If disabled, app still supports paper trading.
- For production hardening:
  - Do not persist raw API secrets.
  - Prefer encrypted vault/key management for API credentials.
  - Add per-user order limits, cooldowns, and 2-step confirmations.
  - Add legal/compliance review before enabling for public users.

## Before Go-Live
- Add rate limiting and abuse protection.
- Add centralized logging and monitoring.
- Add backups for DB and model artifacts.
- Add integration tests for auth, predict, and trade APIs.
