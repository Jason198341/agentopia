# Agentopia — 50 Prompt Progress Tracker

## Infra
- [x] Next.js + Tailwind v4 + TypeScript
- [x] Supabase client setup
- [x] GitHub repo + push
- [x] Vercel deploy
- [x] Domain (agentopia.online) connected via Vercel

---

## Stem 1 — Service Identity
- [x] P001: Elevator pitch (5 versions)
- [x] P002: Official one-line definition
- [x] P003: Competitor differentiation
- [x] P004: Naming candidates (SKIP — Agentopia 확정, 도메인 구매 완료)
- [x] S001: Identity summary

## Stem 2 — Target Users
- [x] P005: 3 user personas
- [x] P006: MVP target selection
- [x] P007: First 100 users acquisition
- [x] P008: Churn prediction & defense
- [x] S002: Target summary

## Stem 3 — Core Game Mechanics
- [x] P009: Core loop design (3 versions)
- [x] P010: Core loop selection & simplification
- [x] P011: Progression system
- [x] P012: Balance prediction
- [x] S003: Game design doc

## Stem 4 — Agent Design System
- [x] P013: Agent onboarding flow
- [x] P014: Stat system & prompt mapping
- [x] P015: Agent evolution system
- [x] P016: Agent limitations
- [x] S004: Agent bible

## Stem 5 — Competition & Debate
- [x] P017: Competition format brainstorm
- [x] P018: MVP competition selection
- [x] P019: Win/loss judgment system
- [x] P020: Defeat handling UX
- [x] S005: Competition rulebook

## Stem 6 — Economy System
- [x] P021: Virtual currency design
- [x] P022: Real money flow
- [x] P023: Free vs premium tiers
- [x] P024: Agent marketplace
- [x] S006: Economy whitepaper

## Stem 7 — Tech Architecture
- [x] P025: Minimum tech stack
- [x] P026: Claude API challenges
- [x] P027: Data collection policy
- [x] P028: Scaling plan
- [x] S007: Tech overview

## Stem 8 — Revenue Model
- [x] P029: All revenue models
- [x] P030: First revenue model selection
- [x] P031: Pricing strategy
- [x] P032: B2B products
- [x] S008: Revenue forecast

## Stem 9 — Risk & Ethics
- [x] P033: Top 10 failure scenarios
- [x] P034: Top 3 risk mitigation
- [x] P035: Ethics charter
- [x] P036: Legal checklist
- [x] S009: Risk management plan

## Stem 10 — MVP Execution
- [x] P037: MVP feature scope
- [x] P038: 8-week sprint plan
- [x] P039: Validation metrics
- [x] P040: Beta launch event
- [x] S010: MASTER PLAN

---

## W1 — DB + Auth + Agent CRUD
- [x] DB schema migration (5 tables, indexes, RLS, triggers)
- [x] Supabase project created (jfcgagwxmlzygwdwyqpc)
- [x] Migration applied to Supabase
- [x] .env.local configured
- [x] Supabase SSR auth (client/server/middleware)
- [x] Login/Signup pages
- [x] Auth callback route
- [x] Protected routes (middleware redirect)
- [x] Dashboard page (Server Component)
- [x] Agent types + 5 presets
- [x] Agent Zustand store (CRUD + optimistic updates)
- [x] Agent creation page (8 sliders + specialties + presets)
- [x] Agent detail page (stats bars, ELO tier, record)
- [x] Agent edit page (8 stat sliders, specialties, strategies)

## W2 — Battle System
- [x] Battle types (Battle, BattleTurn, BattleScore, TURN_SEQUENCE)
- [x] 54 debate topics (DB-driven, 3 difficulty levels, 10 categories)
- [x] Battle prompts (stat-to-prompt mapping, judge rubric)
- [x] AI abstraction (fireworksCompletion + CompletionFn type)
- [x] Supabase admin client (service role key)
- [x] Battle engine (executeTurn, judgeBattle, calculateElo, runFullBattle)
- [x] POST /api/battles route (auth → quota → match → engine → persist)
- [x] NPC agents seeded (5 presets)
- [x] Battle Zustand store (startBattle → POST → battle_id)
- [x] Battle launcher page (agent selector + find battle)
- [x] Battle replay page (live animation, 21-step reveal)
- [x] Score comparison bars (6 criteria)
- [x] Share card (Web Share API + clipboard fallback)
- [x] Strategy black box reveal (turnstrategies, PRO/CON reveal)
- [x] Battle analysis report (radar chart, branching point, stat recommendations)
- [x] ELO tiers system (Bronze → Master, 6 tiers)
- [x] Leaderboard page (sortable, filterable, tier badges)
- [x] Dashboard battle feed (recent battles, agent W/L/streak)
- [x] Badge system (13 badges, checkNewBadges)
- [x] Auto-trait evolution (Confidence, Caution, Grit, Giant Slayer, Experienced)
- [x] Topic stats tracking (pro_wins, con_wins per topic)

## W3 — Economy (BYOK)
- [x] Free battle counter (50 free, profiles.free_battles_remaining)
- [x] Quota check in battle API
- [x] Dashboard + battle launcher quota display (3 color states)
- [x] BYOK: OpenAI completion factory (createOpenAICompletion)
- [x] BYOK: Battle engine accepts CompletionFn injection
- [x] BYOK: Battle API accepts api_key, bypasses quota with valid key
- [x] API key validation endpoint (/api/validate-key)
- [x] Settings page (API key input, validation, delete, security info)
- [x] battleStore sends localStorage key with requests
- [x] battle-launcher enables button when exhausted + has key
- [x] Dashboard links to settings

## W4 — Polish & Launch
- [x] Landing page overhaul (hero, how-it-works, features, pricing, CTA)
- [x] OG metadata + Twitter cards
- [x] Page-level metadata (title template)
- [x] robots.txt + sitemap.ts
- [x] Loading skeletons (dashboard, battle, leaderboard, settings)
- [x] Nav bar (responsive, Settings link, admin conditional)
- [x] Admin panel + topics CRUD
- [x] Responsive navigation (mobile hamburger menu)

## W5 — Multi-Provider BYOK + Analytics
- [x] Multi-provider AI: Claude (Anthropic) completion factory
- [x] Multi-provider AI: Gemini (Google) completion factory
- [x] Provider factory pattern (createCompletionFn → provider routing)
- [x] Multi-provider key validation (OpenAI/Claude/Gemini endpoints)
- [x] Settings: provider tab selector (OpenAI/Claude/Gemini)
- [x] Settings: model selector per provider (e.g. GPT-4o-mini, Sonnet 4.6, Gemini 2.0 Flash)
- [x] Settings: per-provider API key guide (step-by-step)
- [x] Settings: F12 localStorage verification guide
- [x] battleStore: sends provider + model with BYOK requests
- [x] Battle API: routes to correct CompletionFn by provider
- [x] Battle API: stores provider name as model_tier
- [x] Client/server import split (providers.ts for safe client import)
- [x] Agent detail: ELO trend graph (SVG line chart)
- [x] Agent detail: per-criteria score trends (sparklines)
- [x] Agent detail: battle history with per-criteria data
- [x] Battle replay: post-battle analysis (radar, branching point, stat recs)
- [x] Specialty synergy bonus (topic category matches agent specialty)
- [x] Admin: battle stats page (PRO/CON rates, model distribution, daily trend, top topics)
- [x] Admin: category distribution chart
- [x] Admin: battle stats linked from admin dashboard

## W6 — Railway Docker Worker + Supabase Realtime
- [x] DB migration: 005_async_battles.sql (worker columns, polling index, claim/reclaim RPCs)
- [x] Supabase Realtime: battles + battle_turns publication enabled
- [x] Worker: package.json, tsconfig.json (path alias @/ → ../src/)
- [x] Worker: Dockerfile (node:22-slim, healthcheck)
- [x] Worker: index.ts (2s polling loop, 60s stale cron)
- [x] Worker: claim.ts (claim_pending_battle RPC, FOR UPDATE SKIP LOCKED)
- [x] Worker: execute.ts (turn-by-turn execution, immediate DB save per turn)
- [x] Worker: health.ts (HTTP /health endpoint for Railway)
- [x] Worker: cron.ts (reclaim_stale_battles, 5min timeout, 3 retries)
- [x] battle-engine.ts: export executeTurn + judgeBattle (shared with worker)
- [x] API refactor: route.ts creates pending battle (~200ms), no execution
- [x] API: free_battles_remaining decremented at battle creation (not completion)
- [x] API: byok_config JSONB saved to battles table for worker
- [x] Client: BattleLive component (Realtime subscription, progress bar, auto-reload)
- [x] Client: page.tsx routes pending/in_progress → BattleLive, completed → BattleReplay
- [x] Client: launcher loading message updated (30s → instant)
- [x] Battle type: added current_turn, error_message fields
- [x] Worker: esbuild bundler (build.mjs, @/ alias resolution)
- [x] Supabase migration applied to production (SQL Editor)
- [x] Railway deployment (Docker worker — overflowing-connection project)
