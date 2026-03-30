# DharmaDaily

> Your personal Hindu spiritual companion on WhatsApp. Daily Rashi readings, curated Sanskrit scripture, and devotional challenges — delivered every morning.

## Stack

- **Backend**: Node.js + Express (Railway)
- **Database**: PostgreSQL via Supabase (Prisma ORM)
- **Queue**: Redis + BullMQ (Railway)
- **AI**: Anthropic Claude API (claude-sonnet-4-6)
- **WhatsApp**: Twilio WhatsApp API
- **Dashboard**: Next.js (Vercel)

## Monorepo Structure

```
DharmaDaily/
├── server/          # Express backend
├── dashboard/       # Next.js web dashboard
├── scripts/         # Seed scripts, utilities
├── data/
│   └── scriptures/  # Curated verse JSON files
├── .eslintrc.json
├── .prettierrc
├── .gitignore
└── package.json     # Root npm workspace
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (Supabase)
- Redis
- Twilio account with WhatsApp enabled
- Anthropic API key

### Setup

1. Clone the repository
2. Copy environment files:
   ```bash
   cp server/.env.example server/.env
   cp dashboard/.env.example dashboard/.env.local
   ```
3. Fill in all required environment variables
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run database migrations:
   ```bash
   cd server && npx prisma migrate dev
   ```
6. Seed scripture data:
   ```bash
   npm run seed:scriptures --workspace=server
   ```
7. Start development servers:
   ```bash
   npm run dev:server
   npm run dev:dashboard
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev:server` | Start backend with nodemon |
| `npm run dev:dashboard` | Start Next.js dev server |
| `npm test` | Run all server tests |
| `npm run lint` | Lint all workspaces |
| `npm run seed:scriptures --workspace=server` | Seed scripture database |

## License

Private — all rights reserved.
