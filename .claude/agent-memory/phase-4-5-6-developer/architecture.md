---
name: DharmaDaily Architecture Decisions
description: Key architectural and coding conventions established during Phase 4-6 development
type: project
---

**Stack confirmed:**
- AI provider: Anthropic Claude (claude-sonnet-4-6), NOT Gemini (engineering_tasks.md says Gemini but implementation_plan.md says Claude — Claude is used; config file is server/src/config/anthropic.js)
- Auth: OTP via Twilio SMS (plain SMS number, not WhatsApp) + JWT (7-day expiry, payload: {userId, phone})
- OTP storage: stored on User record (otpCode, otpExpiry fields) — NOT Redis
- Rate limiting: express-rate-limit; OTP limiter is phone-keyed (not IP-keyed) and lives in the auth router itself
- CORS origin: controlled via DASHBOARD_URL env var (defaults to * in dev)

**File structure conventions:**
- All server-side code is CommonJS ('use strict'; module.exports)
- All dashboard code is React/JSX with 'use client' where needed
- Styles: inline JS style objects (no Tailwind, no CSS modules) — consistent across all dashboard pages
- Logger: winston structured JSON, imported from server/src/utils/logger.js
- DB: Prisma singleton from server/src/config/db.js

**Prisma schema notes:**
- otpCode (String?) and otpExpiry (DateTime?) were added to User model in 2026-03-27 session
- MediaConfig model added in 2026-03-28 session (migration: 20260328180436_add_media_config)
  - Fields: id (cuid), key (unique String), url (String), type ("audio"|"image"), label (String), updatedAt
  - Accessed as db.mediaConfig in server code
- DailyMessage.date is @db.Date (PostgreSQL date type, not timestamp)

**MediaConfig / media message pattern:**
- getTuesdayHanumanSpecial() returns { text: string, mediaUrl: string|null } (NOT a plain string)
- All other bonusMessageService functions still return plain strings
- bonusMessageJob.js handles the two shapes via destructuring for tuesday_hanuman case
- sendWhatsAppMessage(to, body, mediaUrl?) — mediaUrl is optional; if present it is passed as params.mediaUrl = [mediaUrl] to Twilio (Twilio expects an array)
- Dashboard API methods for media: api.getMedia(), api.upsertMedia(data), api.deleteMedia(key)

**Route architecture:**
- /api/auth/* — no JWT required; OTP limiter only on /send-otp (in auth router)
- /api/* — apiLimiter (60/IP/min) + authenticate middleware applied at app.use level
- /webhook/* — no rate limit; Twilio signature validation in twilioAuth.js middleware

**Dashboard auth pattern:**
- JWT stored in localStorage under key 'dharma_token'
- isLoggedIn() checks presence (does not validate expiry)
- Auth guard pattern: useEffect that calls router.replace('/login') if !isLoggedIn()
- 401 API errors trigger logout() + router.replace('/login')
