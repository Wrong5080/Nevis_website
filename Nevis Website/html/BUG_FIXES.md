# NeViS Backend — Bug Fix Report  
**v3.0 → v3.1**

---

## 🐛 Critical Bugs Fixed

### Bug 1 — Login always crashes (TypeError)
**File:** `routes/auth.js`  
**Problem:** Login route called `user.comparePassword(password)`, but `models/User.js` defines `checkPassword()`, not `comparePassword()`. Every login attempt threw a TypeError and returned 500.  
**Fix:** Changed to `user.checkPassword(password)` and added `.select('+password +failedLoginCount +lockUntil')` since the password field has `select: false`.

---

### Bug 2 — All authenticated requests rejected as "Invalid token"
**File:** `routes/auth.js` vs `middleware/auth.js` + `services/tokenService.js`  
**Problem:** `routes/auth.js` had its own `issueTokens()` that signed JWTs **without** `issuer: "nevis-backend"` or `audience: "nevis-client"` claims. But `tokenService.verifyAccessToken()` (used by `middleware/auth.js`) verifies those claims — so every token issued by the login route was immediately rejected by the auth middleware on any protected route.  
**Fix:** Removed the duplicate `issueTokens()` in auth routes and imported `{ issueTokens }` from `services/tokenService.js`.

---

### Bug 3 — Account lockout silently ignored
**File:** `routes/auth.js`  
**Problem:** `User.checkPassword()` returns `{ valid, locked }` with lockout logic, but the old code only checked the password validity — a locked account would just respond "Invalid credentials" with no lockout message and no `Retry-After` header.  
**Fix:** Added explicit lockout handling: if `locked === true`, return **423 Locked** with a human-readable message and a `Retry-After` header.

---

### Bug 4 — Missing `JWT_REFRESH_SECRET` in `.env.example`
**File:** `.env.example` (was `I.env`)  
**Problem:** `server.js` validates `REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"]` at startup and exits if any are missing. The `.env` example didn't include `JWT_REFRESH_SECRET`, so any developer following the README would have the server refuse to start.  
**Fix:** Added `JWT_REFRESH_SECRET` to `.env.example` with instructions.

---

### Bug 5 — `change-password` endpoint missing
**File:** `routes/auth.js`  
**Problem:** README documents `POST /api/auth/change-password` and it is listed in the security features ("revoke session on password change"), but the route did not exist.  
**Fix:** Implemented the endpoint with `requireAuth`, `strictLimiter`, validation, `checkPassword()` verification, password update, access token blacklisting via `revokeToken()`, and refresh cookie clearing.

---

### Bug 6 — Logout doesn't invalidate the access token
**File:** `routes/auth.js`  
**Problem:** Logout only cleared the refresh cookie. The access token (valid for 15 min) remained usable — any client holding it could still hit protected routes after "logout".  
**Fix:** On logout, the Bearer token from the `Authorization` header is now passed to `revokeToken()` to add it to the in-memory blacklist until it naturally expires.

---

### Bug 7 — Duplicate rate limiter definitions
**File:** `routes/auth.js`  
**Problem:** The route file defined its own `authLimiter` and `strictLimiter` with `rateLimit()`, duplicating `middleware/rateLimiter.js`. Two separate instances = two separate windows, halving effective protection.  
**Fix:** Removed inline definitions; import `{ authLimiter, strictLimiter, profileLimiter }` from `middleware/rateLimiter.js`.

---

## ✨ New Files (Website)

| File | Description |
|---|---|
| `public/Login.html` | Professional sign-in page — split layout, brand panel, remember-me, password toggle |
| `public/register.html` | Registration page — live password strength meter with requirement checklist |
| `public/forgot-password.html` | Dual-purpose: forgot-password form + reset-password form (token-based routing) |
| `.env.example` | Complete environment template including the previously missing `JWT_REFRESH_SECRET` |

---

## Project Structure (after fixes)

```
nevis-backend/
├── server.js
├── .env.example          ← Fixed: JWT_REFRESH_SECRET added
├── package.json
├── config/
│   ├── logger.js
│   └── database.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   ├── requestId.js
│   └── validate.js
├── models/
│   └── User.js           ← Use this (has checkPassword + lockout)
├── routes/
│   ├── auth.js           ← Fixed (7 bugs)
│   └── contact.js
├── services/
│   ├── emailService.js
│   └── tokenService.js
├── utils/
│   ├── ApiError.js
│   └── asyncHandler.js
└── public/
    ├── Login.html        ← New
    ├── register.html     ← New
    └── forgot-password.html ← New
```
