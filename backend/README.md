The Lodge Family Backend

Setup
- Install dependencies: `npm install`
- Create `.env` from `.env.example` and fill required values.
- Recommended dev ports: backend `5000`, frontend `3003`.

Environment Variables
- `DATABASE_URL`: MySQL connection string used by Prisma.
- `APP_URL`: Backend base URL, default `http://localhost:5000`.
- `FRONTEND_URL`: Frontend base URL, default `http://localhost:3003`.
- `JWT_SECRET`: Secret for signing JWTs.
- `QR_HMAC_SECRET`: Secret for QR payload HMAC.
- SMTP (for email delivery):
  - `EMAIL_PROVIDER`: set to `smtp`.
  - `SMTP_HOST`: e.g., `smtp.hostinger.com`.
  - `SMTP_PORT`: `465` for SSL or `587` for STARTTLS.
  - `SMTP_SECURE`: `true` for 465, `false` for 587.
  - `SMTP_USER`: mailbox, e.g., `no-reply@yourdomain.com`.
  - `SMTP_PASS`: mailbox password.
  - `FROM_EMAIL`: sender address, usually same as `SMTP_USER`.
  - `FROM_NAME`: sender display name.

Development
- Start dev server: `npm run dev` (uses ts-node-dev).
- Health endpoint: `GET /api` returns JSON `{ status: 'ok' }`.
- Email: backend uses Nodemailer. In dev, failures are logged without breaking flow.

Prisma
- Generate client: `npm run prisma:generate`.
- Migrations (dev): `npm run prisma:migrate`.
- Deploy migrations: `npm run prisma:deploy`.

Notes
- Frontend proxies `/api/*` to backend via Next.js rewrites, so use relative paths in fetch (e.g., `fetch('/api/login')`).