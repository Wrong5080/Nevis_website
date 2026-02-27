# NeViS Backend — v3.0 Enterprise Edition

> Official backend for the **Nevis_G10** personal portfolio site.  
> Stack: **Express · MongoDB · JWT · Winston · Helmet · Nodemailer**

---

## 📁 Project Structure

```
nevis-backend/
├── server.js                  ← Entry point
├── package.json
├── .env.example               ← Copy → .env and fill in values
│
├── config/
│   ├── logger.js              ← Winston structured logging + rotation
│   └── database.js            ← MongoDB connect / disconnect + retry
│
├── models/
│   └── User.js                ← Full-featured Mongoose schema
│
├── middleware/
│   ├── auth.js                ← requireAuth / optionalAuth / requireAdmin / requireRole
│   ├── errorHandler.js        ← Central error formatter
│   ├── rateLimiter.js         ← All rate-limit configs
│   ├── requestId.js           ← UUID per-request tracing
│   └── validate.js            ← express-validator → ApiError bridge
│
├── routes/
│   └── auth.js                ← 9 auth endpoints
│
├── services/
│   ├── emailService.js        ← Nodemailer + beautiful HTML templates
│   └── tokenService.js        ← JWT issue / verify / revoke (blacklist)
│
└── utils/
    ├── ApiError.js            ← Custom error class with HTTP codes
    └── asyncHandler.js        ← try/catch wrapper for async routes
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in MongoDB URI, JWT secrets, email credentials

# 3. Start
npm run dev       # Development (nodemon)
npm start         # Production
```

---

## 🔌 API Reference

All endpoints return:
```json
{ "success": true|false, "message": "...", ...data }
```
Errors always include a machine-readable `code` field.

### Auth  `/api/auth`

| Method | Endpoint            | Auth | Rate Limit | Description                        |
|--------|---------------------|------|------------|------------------------------------|
| POST   | `/register`         | —    | 15/15min   | Create account, send welcome email |
| POST   | `/login`            | —    | 15/15min   | Sign in, get JWT pair              |
| POST   | `/refresh`          | —    | global     | Rotate refresh cookie → new token  |
| POST   | `/logout`           | —    | global     | Revoke token, clear cookie         |
| POST   | `/forgot-password`  | —    | 5/hr       | Send password-reset email          |
| POST   | `/reset-password`   | —    | 5/hr       | Apply new password with token      |
| GET    | `/profile`          | ✔    | 30/min     | Get own profile                    |
| PATCH  | `/profile`          | ✔    | 30/min     | Update username / bio / avatar     |
| POST   | `/change-password`  | ✔    | 5/hr       | Change password, revoke session    |

### Health  `/api/health`
Returns server status, DB state, uptime, and request ID.

---

## 🛡️ Security Features

| Feature | Details |
|---|---|
| **Helmet.js** | 12+ security headers incl. CSP, HSTS (prod), X-Frame-Options |
| **CORS whitelist** | Only origins in `ALLOWED_ORIGINS` env var are allowed |
| **Rate limiting** | Global (200/10min) + per-route stricter limits |
| **HPP** | Prevents HTTP Parameter Pollution attacks |
| **Mongo sanitize** | Strips `$` and `.` operators from all inputs |
| **bcrypt** | Cost factor 12 (configurable via `BCRYPT_ROUNDS`) |
| **JWT blacklist** | Revoked tokens stored in-memory until expiry |
| **Account lockout** | 5 failed logins → 30-minute lock |
| **Constant-time auth** | bcrypt always runs, prevents timing attacks |
| **Request ID tracing** | UUID on every request via `X-Request-Id` header |
| **Secure reset tokens** | `crypto.randomBytes(32)` — not JWT, stored in DB |
| **Email enumeration** | `/forgot-password` always returns 200 |
| **httpOnly cookies** | Refresh token never accessible to JavaScript |

---

## 📝 Logging

Logs are written to:
- **Console** — coloured in dev, JSON in prod
- `logs/combined-YYYY-MM-DD.log` — all levels, 7-day retention
- `logs/error-YYYY-MM-DD.log` — errors only, 14-day retention
- `logs/exceptions-*.log` — unhandled exceptions
- `logs/rejections-*.log` — unhandled promise rejections

Set `LOG_LEVEL=debug` in `.env` for verbose output.

---

## 📧 Email Templates

All emails use a branded HTML template (NeViS crimson theme):

- **Welcome** — sent on successful registration
- **Password Reset** — 15-minute expiry link + raw URL
- **Login Alert** — sends IP + user-agent on new login

---

## 🔧 Environment Variables

See `.env.example` for the full list with descriptions.  
Minimum required for startup:

```env
MONGO_URI=mongodb://127.0.0.1:27017/nevis
JWT_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<64-char hex>
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
