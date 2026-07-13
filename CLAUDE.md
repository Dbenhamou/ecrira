# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Project

Ecrira (internal/legacy name: Postoria — see README.md and .env references) is a Next.js SaaS that generates,
schedules, and publishes LinkedIn posts for B2B professionals using Claude. Users get daily AI-generated post
ideas tailored to their sector/audience, can write full posts and matching visuals, and publish straight to
LinkedIn (immediately or scheduled via cron).

## Commands

```bash
npm run dev      # start Next.js dev server (localhost:3000)
npm run build    # production build (Vercel build uses NODE_OPTIONS=--max-old-space-size=3008, see vercel.json)
npm start        # run built app
```

There is no lint script, no test suite, and no test runner configured in this repo. Do not assume `npm test` or
`npm run lint` exist.

## Architecture

**Stack**: Next.js 14 (Pages Router, not App Router), React 18, TypeScript, Supabase (Postgres + Auth), Stripe
billing, Anthropic Claude API, Google Gemini (image generation), Sharp (image compositing), Browserless
(headless Chrome, used to rasterize SVG visuals to PNG for LinkedIn upload).

**This is not a component-per-route app.** `pages/app.tsx` (~2600 lines) is the entire authenticated product —
a single-page app with internal `page` state (`apercu` / `idees` / `rediger` / `visuels` / `bibliotheque` /
`profil` / `calendrier`) rather than separate Next.js routes. All dashboard, editor, calendar, library, and
profile UI lives in that one file alongside dozens of `useState` hooks. `pages/index.tsx` is the public
marketing/landing page with its own auth modal (redirects to `/app` once a Supabase session exists).
`pages/landing.tsx`, `pages/login.tsx`, `pages/pricing.tsx` are separate standalone pages.

**Auth**: Supabase Auth (email/password). Client components use `supabase.auth.getSession()` /
`onAuthStateChange`. API routes call `requireAuth()` (`lib/auth-helper.ts`), which validates the
`Authorization: Bearer <token>` header via `supabase.auth.getUser(token)` and applies a per-IP in-memory rate
limit (resets on cold start, so it's best-effort on serverless, not a hard guarantee). `checkOrigin()` in the
same file guards against cross-origin API calls.

**Profile/plan model** (`lib/useProfile.ts`, `lib/usePlan.ts`): a `profiles` row is auto-created via Supabase
trigger on signup (`supabase-schema.sql`), then upserted client-side with a 7-day `trial_ends_at` on first
load. Plan tiers are `free` / `trial` / `pro`. **`supabase-schema.sql` only reflects the original bootstrap
schema** — the app reads/writes many additional columns (`plan`, `posts_count_this_month`,
`stripe_customer_id`, `stripe_subscription_id`, `linkedin_token` + expiry + id, `brand_bg/text/accent/color2/3`,
`domain`, `company_logo`, `writing_style`, `formality`, `summary`, `keywords`, `tone`, `content_themes`,
`pain_points`) plus separate `scheduled_posts` and `notifications` tables that were added later directly in
Supabase and are not tracked anywhere in the repo. Treat the live Supabase schema (via `mcp Supabase` tools or
the dashboard) as the source of truth, not the SQL file. Note: `posts_count_this_month` is incremented in
`pages/api/generate.ts` but never reset by any cron — despite the name it behaves as a lifetime counter (free
plan = 5 posts total).

**Content generation** (`pages/api/generate.ts`, `pages/api/ideas.ts`): calls Claude (`claude-sonnet-4-6` for
post copy, `claude-haiku-4-5-20251001` for the cheaper daily-ideas list) with a system prompt built from the
user's profile (role, sector, audience, keywords, pain points) plus recent NewsAPI headlines for grounding.
Style mimicry: `profile.writing_style` stores up to a few reference LinkedIn posts (JSON array, with a legacy
plain-string fallback) that get folded into the prompt so output matches the user's voice. Both routes have
per-user hourly rate limits (in-memory `Map`, resets on cold start).

**Visual generation — two distinct pipelines**:
- `pages/api/generate-visual.ts`: asks Claude to emit a full SVG (1080x1350) from one of several hardcoded
  layout templates (`classique`, `timeline`, `stat`, `citation`, `liste`), then sanitizes the SVG server-side
  (strips scripts/event handlers, redacts hashtags/footers Claude may hallucinate) and stamps the Ecrira/company
  logo as inline base64 `<image>`.
- `pages/api/generate-image-ai.ts`: Pro-only. Haiku extracts a short visual brief (title/stat/label/background
  description) from the post, Gemini (`gemini-3.1-flash-image`) generates a photorealistic 1080x1080 image
  from that brief, then Sharp crops/composites a brand-color gradient overlay and the Ecrira logo.
- SVG-based visuals are rasterized to PNG via Browserless (`pages/api/svg-to-png.ts` and duplicated logic in
  `pages/api/cron-publish.ts`) before being uploaded to LinkedIn, since LinkedIn's API needs a raster image.

**LinkedIn integration**: OAuth 2.0 (`pages/api/linkedin/auth.ts` → `callback.ts`), token + expiry stored on
the profile row. `pages/api/publish.ts` / `pages/api/linkedin/publish.ts` / `publish-with-image.ts` post
immediately via the LinkedIn UGC API; `pages/api/schedule.ts` (Pro-gated) persists to `scheduled_posts`, and
`pages/api/cron-publish.ts` (Vercel Cron, secured by `Authorization: Bearer $CRON_SECRET`) sweeps due posts and
publishes them, converting any attached SVG/PNG visual first.

**Billing**: Stripe Checkout (`pages/api/stripe/checkout.ts`) + webhook (`pages/api/stripe/webhook.ts`,
raw-body signature verification) flips `profiles.plan` between `free`/`pro` on
`checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`.

**Cron jobs** (Vercel Cron, all gated on `CRON_SECRET`): `cron-emails.ts` (lifecycle/nudge emails),
`cron-ideas.ts` (regenerates `daily_ideas` for every profile), `cron-publish.ts` (publishes due scheduled
posts). Only `cron-emails` is registered in `vercel.json`'s `crons` array — check the Vercel project's Cron
Jobs settings for any dashboard-configured schedules for the other two, since they aren't declared in code.

**Notifications** (`lib/notify.ts`): writes to a `notifications` table and optionally emails via Resend
(`RESEND_API_KEY`); silently no-ops on email if the key or `userEmail` is missing.

**i18n** (`lib/i18n.ts`): flat key → string dictionaries for `fr`/`en`, looked up via `t(lang, key)`. No
pluralization/interpolation helpers — string concatenation is done inline at call sites. Adding UI text means
adding the key to both `fr` and `en` blocks.

**Security headers/CSP**: defined in `next.config.js`, applied to all routes; `connect-src` is scoped to
Supabase, Anthropic, LinkedIn, and Stripe — extending outbound calls to a new third-party API requires updating
the CSP there too.

## Environment variables

Required (see `.env.local`, not committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (used server-side by most `pages/api/*` routes via a service-role client, bypassing
RLS — never expose it client-side), `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `NEWS_API_KEY`,
`BROWSERLESS_API_KEY`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
(LinkedIn vars aren't in `.env.local` but are read in `pages/api/linkedin/*`), `RESEND_API_KEY` (optional,
email notifications degrade silently without it).
