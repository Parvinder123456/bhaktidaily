# DharmaDaily — End-to-End Test Checklist

> Run all scenarios before promoting to beta.
> All WhatsApp tests require the Twilio sandbox (or production number) to be active and the server deployed to Railway (or running locally with ngrok).

---

## Environment Setup

- [ ] Railway backend URL is accessible: `GET /health` returns `{ status: "ok", db: "connected" }`
- [ ] Twilio webhook URL is set to the Railway backend: `https://<your-railway-url>/webhook/whatsapp`
- [ ] Dashboard is deployed to Vercel and `NEXT_PUBLIC_API_URL` points to Railway backend
- [ ] All environment variables are set in Railway and Vercel dashboards

---

## Scenario 1 — New user onboarding (Step 0)

**Setup:** Use a phone number not previously registered.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Send "Hi" to the Twilio WhatsApp sandbox number | Receive greeting + name prompt |
| 2 | Verify in DB | `User` record created with `isOnboarded = false`, `onboardingStep = 0` |

**Pass / Fail:** ___

---

## Scenario 2 — Complete full onboarding

**Setup:** Continue from Scenario 1.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Reply with your name (e.g. "Arjun") | Receive Rashi selection prompt |
| 2 | Reply "3" (Mithun) | Receive language selection prompt |
| 3 | Reply "1" (English) | Receive delivery time selection prompt |
| 4 | Reply "2" (7:00 AM) | Receive confirmation message |
| 5 | Verify in DB | `User.isOnboarded = true`, `rashi = "Mithun"`, `language = "en"`, `deliveryTime = "07:00"` |

**Pass / Fail:** ___

---

## Scenario 3 — Daily message delivery

**Setup:** Update the test user's `deliveryTime` to 2 minutes from now (e.g. `UPDATE "User" SET "deliveryTime" = '14:32' WHERE phone = '+91...'`).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Wait for the scheduled time | WhatsApp message arrives with Rashi reading, verse, and challenge |
| 2 | Verify in DB | `DailyMessage` record created with `sentAt` populated |
| 3 | Run the scan again (within same minute) | No duplicate message sent |

**Pass / Fail:** ___

---

## Scenario 4 — Reply to daily message (streak increment)

**Setup:** Receive the daily message from Scenario 3.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Reply to the daily message with "Thank you" | AI replies with a chat response |
| 2 | Verify in DB | `DailyMessage.replied = true` for today's record |
| 3 | Verify in DB | `User.streakCount` incremented by 1, `lastInteraction` updated |

**Pass / Fail:** ___

---

## Scenario 5 — Streak reset after 2 inactive days

**Setup:** Ensure the test user has a streak > 0. Set `lastInteraction` to 3 days ago in the DB.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Trigger `streakCheckJob` (or wait for midnight IST) | `User.streakCount` reset to `0` |
| 2 | Verify in logs | `checkAndResetStreaks` log shows the user was reset |

**Pass / Fail:** ___

---

## Scenario 6 — 7-day streak milestone

**Setup:** Set `User.streakCount = 6` and `User.lastInteraction` to yesterday in the DB.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Send any message to the bot | AI reply received |
| 2 | Verify message contains milestone | Reply includes "7-day streak! Saptha" milestone message |
| 3 | Verify in DB | `User.streakCount = 7` |

**Pass / Fail:** ___

---

## Scenario 7 — AI chat response with scripture reference

**Setup:** Use a fully-onboarded user.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Send "What is karma?" to the bot | AI responds with an explanation grounded in Hindu scripture |
| 2 | Verify response quality | Response references the Bhagavad Gita or another valid scripture |
| 3 | Verify response length | Under 200 words |
| 4 | Verify in DB | Two `Conversation` records added (role: user, role: assistant) |

**Pass / Fail:** ___

---

## Scenario 8 — Web dashboard login with OTP

**Setup:** Use the deployed Vercel dashboard URL.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `https://<vercel-url>/login` | Login page renders correctly |
| 2 | Enter phone number, click "Send OTP" | OTP SMS received on the phone |
| 3 | Enter correct OTP, click "Verify & Sign in" | JWT stored in localStorage, redirected to `/dashboard` |
| 4 | Enter wrong OTP | Error: "Invalid OTP, please try again" displayed inline |
| 5 | Wait 10+ minutes and use expired OTP | Error: "OTP expired" displayed |

**Pass / Fail:** ___

---

## Scenario 9 — Dashboard shows correct streak

**Setup:** Logged in as a user with a known streak count.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/dashboard` | Page loads without errors |
| 2 | Check streak card | Streak count matches `User.streakCount` in DB |
| 3 | If today's message exists | Today's message card shows horoscope, verse, and challenge |
| 4 | If no message today | Card shows "Your daily message will arrive at [deliveryTime]" |
| 5 | Open `/dashboard` without a JWT | Redirected to `/login` |

**Pass / Fail:** ___

---

## Scenario 10 — Change Rashi in settings, reflected in next daily message

**Setup:** Logged in as a user with Rashi = "Mithun".

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/settings` | Form pre-fills with current Rashi (Mithun), language, and delivery time |
| 2 | Change Rashi to "Sinh", click "Save Changes" | Success toast: "Settings saved!" |
| 3 | Verify in DB | `User.rashi = "Sinh"` |
| 4 | Trigger a new daily message | Message mentions "Sinh Rashi" in the horoscope section |
| 5 | Open History page | Past messages visible with "Load more" pagination |

**Pass / Fail:** ___

---

## Stability Check

- [ ] Zero unhandled promise rejections in Railway logs during a 30-minute observation period
- [ ] All 10 scenarios above: PASS
- [ ] At least 3 Rashis tested for daily message variety and tone quality
- [ ] Daily messages reviewed for cultural sensitivity and spiritual accuracy

---

## Sign-off

| Tester | Date | Notes |
|--------|------|-------|
| | | |

> Beta launch is approved when all 10 scenarios pass and zero unhandled rejections are observed.
