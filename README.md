# BESS Intelligence Brief

A GB & European battery energy storage (BESS) intelligence dashboard and daily
email digest, built for an energy storage advisor tracking transactions,
offtake structures, and market/policy developments.

See `CLAUDE.md` for full architecture and design decisions.

## What it does

1. Fetches RSS feeds from BESS/energy news sources, plus scrapes Ofgem's
   news-and-insight page directly (Ofgem has no RSS feed).
2. Deduplicates against previously-seen stories, then scores/categorises/
   summarises each new story with Claude, dropping anything below the
   relevance threshold.
3. Stores results in Upstash Redis and renders them on a public dashboard,
   split into Europe-scoped category tabs and a "Rest of World (High
   Relevance)" tab.
4. Sends a daily email digest via Resend containing only stories that have
   never been sent before.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build         # production build - run before every PR
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
```

Copy `.env.local.example` to `.env.local` and fill in real values to run the
full pipeline locally (see below for where each one comes from).

## Production setup (Vercel)

### 1. Import the project

Import this repo into Vercel. Framework Preset should auto-detect as
**Next.js**; leave Root Directory, Build Command, and Install Command at
their defaults.

### 2. Add Upstash Redis

Vercel's native "KV" product is retired — storage now comes through the
Marketplace integration:

1. Project → **Storage** tab → **Create Database** (or Browse Marketplace) →
   **Upstash for Redis**.
2. Pick a region, save, and you'll be redirected back to Vercel with
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` auto-added to your project's
   environment variables.
3. **Redeploy** — new env vars don't apply to an already-running deployment.

### 3. Add your Anthropic API key

1. Create a key at [console.anthropic.com](https://console.anthropic.com) →
   **API Keys**.
2. Vercel → **Settings → Environment Variables** → add `ANTHROPIC_API_KEY`.
3. Redeploy.

### 4. Add Resend (for the email digest)

1. Sign up at [resend.com](https://resend.com) → create an API key.
2. For a quick start with no domain setup, use Resend's built-in test sender
   `onboarding@resend.dev` as `FROM_EMAIL`. For production, add and verify
   your own domain under Resend's **Domains** page first, then use an
   address at that domain instead.
3. Vercel → **Settings → Environment Variables** → add:
   - `RESEND_API_KEY`
   - `FROM_EMAIL` (see above)
   - `TO_EMAIL` — the inbox that should receive the daily brief
4. Redeploy.

### 5. Populate data and test manually

Since the cron job only runs on its schedule, trigger it manually once to
confirm everything's wired up. From your browser's DevTools console, on your
deployed site:

```js
fetch('/api/run-brief', { method: 'POST' }).then(r => r.json()).then(console.log)
```

This fetches all feeds, scores them with Claude, stores results, and (if
there are any new stories) sends the email digest in the same call — this is
exactly what the cron job does automatically. Refresh the dashboard
afterward to see stories appear.

To test the email step in isolation:

```js
fetch('/api/send-email', { method: 'POST' }).then(r => r.json()).then(console.log)
```

### 6. Cron job

`vercel.json` schedules `/api/run-brief` for 06:30 UTC on weekdays. Vercel
Cron Jobs trigger via a `GET` request, which the route supports (alongside
`POST`, used for manual testing above). No further setup needed — it goes
live as soon as the project is deployed with `vercel.json` present.

## Known limitations

- **Ofgem scraper dates**: Ofgem's news page doesn't expose a machine-readable
  publish date per item, so scraped Ofgem stories are stamped with fetch time
  rather than their real publish date.
- **NESO**: not currently integrated — their site has no RSS/Atom feed and
  wasn't scraped in this pass.
- **Revenue chart**: not yet wired to a real data source; shows an empty
  state until a specific metric/feed is decided on.

## Deploy

`git push origin main` → Vercel auto-deploys. Never deploy manually.
