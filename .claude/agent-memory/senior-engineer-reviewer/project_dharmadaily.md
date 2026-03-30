---
name: DharmaDaily Project Overview
description: DharmaDaily (Daily Divine) is a Hindu spiritual companion app with WhatsApp messaging, AI-powered content, and a Next.js dashboard. Stack: Express + Prisma + PostgreSQL + BullMQ + Redis + Anthropic Claude + Twilio + Next.js.
type: project
---

DharmaDaily is a Hinduism-focused, AI-powered spiritual companion on WhatsApp delivering daily Rashi readings, curated Sanskrit scripture, and devotional challenges.

**Why:** Personal spiritual app for Hindu users, currently in pre-launch build phase.

**How to apply:**
- Backend: Express (Node.js) on Railway, using Prisma ORM with PostgreSQL (Supabase), BullMQ + Redis for scheduling
- AI: Anthropic Claude API (claude-sonnet-4-6) -- originally planned as Gemini, pivoted to Claude
- Messaging: Twilio WhatsApp API for both webhook and outbound messages
- Dashboard: Next.js on Vercel
- 60 curated scripture verses across 5 JSON files (Bhagavad Gita, Upanishads, Ramayana, Mantras, Stotras)
- All 30 engineering tasks (Phases 0-6) have corresponding source files created
- Dashboard dependencies (next, react) are NOT yet installed
- Prisma client is NOT yet generated (no migrations run)
- The project name in code is "DharmaDaily" but the directory is "Daily Divine"
