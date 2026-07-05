# BESS Intelligence Brief — Project Context

## What this project is

A full-stack web application that:
1. **Hosts a live dashboard** at a public Vercel URL — the BESS weekly intelligence
   brief as a permanent, always-current website (not a one-off artifact)
2. **Sends a daily digest email** every weekday morning via Resend, containing only
   stories published since the last send (no repeats, ever)

The dashboard UI is already designed and working as a React artifact. The task
is to productionise it: real data pipeline, persistent deduplication, hosted
frontend, scheduled email delivery.

Owner context: energy storage advisor at Aurora Energy Research, tracking GB +
European BESS transactions, offtake structures (tolls, floors, financial swaps),
and key players (Gresham House/GRID, Zenobē, Field Energy, Statera, Fidra, etc.).

---

## Stack decisions — do not change these without asking

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 App Router (TypeScript) | Vercel-native, RSC for data fetching |
| Styling | Tailwind CSS | Dashboard uses dark theme utility classes |
| Hosting | Vercel | Zero-config deploys, Edge cron support |
| Email | Resend + React Email | Clean API, React component emails |
| Scheduler | Vercel Cron Jobs | No separate infra needed |
| Database | Upstash Redis via Vercel Marketplace integration | Persist seen-story URLs between cron runs; serverless-safe |
| AI analysis | Anthropic Claude API (`claude-sonnet-4-6`) | Scores + summarises RSS articles |
| RSS parsing | `rss-parser` npm package | Lightweight, works in Node.js Edge runtime |

> **Database note:** Vercel's native "KV" product is retired. Set up storage via
> **Vercel dashboard → Storage → Marketplace → Upstash for Redis** — this is what
> "Vercel KV" now means in practice. The integration still injects env vars named
> `KV_REST_API_URL` / `KV_REST_API_TOKEN` for backward compatibility (that's expected,
> not a naming mistake). Use the official `@upstash/redis` package in code, not the
> deprecated `@vercel/kv` wrapper.

---

## Project structure

```
bess-brief-web/
├── app/
│   ├── page.tsx              # Dashboard homepage (the brief)
│   ├── api/
│   │   ├── run-brief/        # POST endpoint: fetch → deduplicate → analyse → store
│   │   └── send-email/       # POST endpoint: render + send via Resend
│   └── layout.tsx
├── components/
│   ├── BriefDashboard.tsx    # Main dashboard shell (tabs, header)
│   ├── StoryCard.tsx         # Individual story card (expandable)
│   ├── RevenueChart.tsx      # ME BESS GB revenue sparkline
│   └── EmailTemplate.tsx     # React Email template for Resend
├── lib/
│   ├── fetcher.ts            # RSS feed fetching + article extraction
│   ├── analyser.ts           # Claude API: score, categorise, summarise
│   ├── dedup.ts              # Upstash Redis seen-story deduplication
│   ├── config.ts             # All feed URLs, player names, keywords
│   └── types.ts              # Shared TypeScript types
├── vercel.json               # Cron job schedule
├── .env.local                # Local secrets (gitignored)
└── CLAUDE.md                 # This file
```

---

## Commands

```bash
npm run dev          # local dev server (localhost:3000)
npm run build        # production build — run before every PR
npm run typecheck    # tsc --noEmit — must pass, no suppressions
npm run lint         # eslint — must pass clean
```

Deploy: `git push origin main` → Vercel auto-deploys. Never deploy manually.

---

## Core rules

**Data pipeline:**
- `dedup.ts` uses Upstash Redis (via the Vercel Marketplace integration) to store seen article URL hashes (SHA-256, first 16 chars)
- A story is marked seen ONLY after a successful Resend delivery — never before
- Cron runs daily at 06:30 UTC; calls `/api/run-brief` then `/api/send-email` in sequence
- `vercel.json` cron path: `"crons": [{"path": "/api/run-brief", "schedule": "30 6 * * 1-5"}]`

**Claude API usage:**
- Always use `claude-sonnet-4-6` — do not upgrade to Opus without asking (cost)
- Batch articles in groups of 8 per API call to stay under token limits
- If Claude returns invalid JSON, log the error and skip the batch — never crash
- Relevance threshold: articles scoring below 6/10 are dropped silently

**Frontend:**
- Server Components fetch story data from Upstash Redis on every request (no client-side fetch)
- `StoryCard` is the only Client Component (needs `useState` for expand/collapse)
- Dark theme: background `#0a0c10`, primary accent `#00e5c8` (GB), keep existing palette
- Do not introduce a component library — Tailwind utility classes only
- The dashboard must be readable on mobile (single column below 768px)

**Email:**
- React Email components live in `components/EmailTemplate.tsx`
- All CSS must be inline (email clients ignore `<style>` tags) — use React Email's `style` prop
- Subject line format: `BESS Brief — {weekday} {date} · {n} new stories`
- Never send an email if `analysedStories.length === 0` — log and exit cleanly

**TypeScript:**
- Strict mode on — no `any`, no `@ts-ignore`
- All API route handlers return typed `NextResponse<ApiResponse>`
- Shared types in `lib/types.ts` — do not duplicate type definitions

**Secrets — never hardcode, always use env vars:**
```
ANTHROPIC_API_KEY
RESEND_API_KEY
KV_REST_API_URL          # provided by the Vercel Marketplace Upstash integration
KV_REST_API_TOKEN        # provided by the Vercel Marketplace Upstash integration
FROM_EMAIL               # verified sender in Resend
TO_EMAIL                 # recipient address
```

---

## RSS feeds (source of truth: `lib/config.ts`)

Primary (weight 3 — always include):
- `https://www.energy-storage.news/feed` — ESS News
- `https://www.investegate.co.uk/rss.aspx?company=GRID` — Gresham House RNS
- `https://www.investegate.co.uk/rss.aspx?company=GSF` — Gore Street RNS
- `https://deltaee.podbean.com/feed.xml` — LCP Delta podcast

Secondary (weight 2):
- `https://www.pv-magazine.com/feed/`
- `https://pexapark.com/feed/`
- `https://www.elgarmiddleton.com/feed/`
- `https://aercommercial.podbean.com/feed.xml`
- `https://www.theguardian.com/environment/energy/rss` — The Guardian Energy
- `https://www.ft.com/companies/energy?format=rss` — Financial Times Energy
- `https://www.energylivenews.com/feed/` — Energy Live News

Also scraped directly (no RSS available): Ofgem news-and-insight, see
`lib/ofgemScraper.ts`.

Removed (no working RSS feed could be found, or the site blocks automated
fetching): Modo Energy research, Modo podcast, Solar Power Portal, Aurora
Energy Research, M&A Community. Reuters was requested but skipped -
reuters.com/business/energy/ is a regular webpage, not an RSS feed, and
Reuters discontinued their public RSS feeds years ago; no working feed
URL was found.

---

## What "done" looks like for each phase

**Phase 1 — Foundation:**
- [ ] `npm run build` passes with zero type errors
- [ ] `/api/run-brief` fetches feeds, calls Claude, stores results in Upstash Redis
- [ ] Dashboard renders stored stories at `app/page.tsx`
- [ ] Vercel preview deploy works

**Phase 2 — Email:**
- [ ] `POST /api/send-email` renders React Email template and delivers via Resend
- [ ] Email only sends when new stories exist
- [ ] Seen-story dedup working: running twice in a row sends 0 stories second time

**Phase 3 — Polish:**
- [ ] Cron job live on production (`vercel.json` confirmed)
- [ ] Revenue chart pulls from Upstash Redis (updated by pipeline)
- [ ] Mobile layout tested at 375px width
- [ ] `README.md` updated with setup instructions

---

## Anti-patterns — do not do these

- Do not use `localStorage` or `sessionStorage` — Vercel Edge environment, use Upstash Redis
- Do not call the Claude API from a Client Component — server-side only
- Do not commit `.env.local` — it's in `.gitignore`
- Do not use `pages/` router — this project uses App Router exclusively
- Do not add a database (Postgres, Supabase, etc.) — Upstash Redis is sufficient for URL hashes
- Do not add authentication — the dashboard is public read-only
