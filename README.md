The Lodge Family Workspace

Quick Start
- Install root dependencies: `npm install`
- Install backend and frontend dependencies:
  - `npm --prefix backend install`
  - `npm --prefix frontend install`
- Copy `backend/.env.example` to `backend/.env` and fill values (database, JWT, QR, SMTP).
- Start both servers: `npm run dev` (runs backend on `5000`, frontend on `3003`).

Email (Hostinger SMTP)
- Set in `backend/.env`:
  - `EMAIL_PROVIDER=smtp`
  - `SMTP_HOST=smtp.hostinger.com`
  - `SMTP_PORT=465` and `SMTP_SECURE=true` (or `587`/`false`)
  - `SMTP_USER` and `SMTP_PASS` to your mailbox
  - `FROM_EMAIL` and `FROM_NAME`
- Request registration code via frontend page `/(auth)/request-code` which calls `POST /api/request-code`.

Proxy and API Calls
- Frontend proxies `/api/*` to backend via `frontend/next.config.ts` rewrites.
- Use relative paths in fetch calls (e.g., `fetch('/api/login')`).

Notes
- Health checks: backend `GET /api` returns JSON.
- Dev Fast Refresh errors in console (HMR) are expected and do not affect functionality.