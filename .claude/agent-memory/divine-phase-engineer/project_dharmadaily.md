---
name: DharmaDaily Project State
description: Core project facts, stack decisions, AI model choice, and phase completion status
type: project
---

Project name is DharmaDaily (not "Daily Divine" — that was the original concept name).

Stack: Node.js + Express (Railway) · PostgreSQL (Supabase) · Redis + BullMQ (Railway) · Google Gemini API (gemini-1.5-flash) · Twilio WhatsApp API · Next.js (Vercel)

**AI Model:** Use `@google/generative-ai` with `gemini-1.5-flash`. Do NOT use Anthropic SDK.

**How to apply:** When building aiService.js, use Google Generative AI SDK, not Anthropic SDK.

Planning documents are located at:
- `C:\Users\parvi\Daily Divine\engineering_tasks.md.resolved`
- `C:\Users\parvi\Daily Divine\implementation_plan.md.resolved`
(Note: .resolved extension, not .md)

Phase status as of 2026-03-27:
- Phase 0 (Bootstrap): COMPLETE — monorepo, env config, Express shell, linting, Jest smoke test
- Phase 1 (Database & Scripture): COMPLETE — Prisma schema, 60 scripture verses (5 JSON files), seed script, scriptureService with 10 tests
- Phase 2 (WhatsApp Integration): COMPLETE — Twilio webhook, userService, onboardingService (5-step state machine), messageRouterService, chatController stub. 26 tests passing.
- Phase 3 (AI Engine & Daily Message): COMPLETE — Gemini AI service (gemini-1.5-flash) with retry, promptService, dailyMessageService, conversationService, chatController. 48 total tests passing.

Key implementation notes:
- AI model: claude-sonnet-4-6 via @anthropic-ai/sdk (NOT Gemini)
- Prisma schema: User, Scripture, DailyMessage, Conversation models with @@unique([source, reference]) on Scripture
- Scripture data: 60 verses (Bhagavad Gita 25, Upanishads 10, Ramayana 10, Mantras 8, Stotras 7)
- Onboarding: 5-step state machine (greeting -> name -> rashi -> language -> delivery time -> confirm)
- messageRouterService lazy-loads chatController to avoid circular dep issues
- Daily message service: picks random theme tag, fetches verse, builds prompt, parses AI output into horoscope + challenge sections
