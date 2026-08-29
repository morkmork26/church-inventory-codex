# Codex Agent Instructions — JILGM Church Inventory

## Project Overview
Full-stack church resource management app: tracking assets, consumables, supply requests, repairs.
- **Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL + RLS + Auth) + Vercel
- **State:** TanStack Query (server) + Zustand (UI)
- **Styling:** Tailwind CSS v4, shadcn-style components
- **Language:** TypeScript 5 (strict)

## Reference Material
- `docs/CURRENT_STATE.md` — what's implemented vs TODO
- `docs/CONVENTIONS.md` — coding style and patterns
- `TEST_PLAN.md` — full manual test plan (production grade)
- `docs/knowledge/` — domain facts, past bugs, workflow patterns from the predecessor app (FlockTrack)
- `docs/ref/` — HTML deep-dives, migration plan, FlockTrack source code for comparison

## Core Architecture Rules

### 1. Append-Only Stock Ledger
Stock quantities are NEVER edited in-place. Every change is a new row in `stock_transactions` with timestamp, actor, reason, and delta. Current quantity = `SUM(delta)`. This is non-negotiable.

### 2. Roles from User Metadata
Roles (admin, staff, viewer) live in Supabase Auth `raw_user_meta_data`. Middleware reads from JWT. RLS policies enforce at DB level. No separate roles table.

### 3. RLS Everywhere
Every table has Row-Level Security enabled. Never bypass with service_role in app code. Test RLS by verifying unauthorized access returns empty, not error.

### 4. Server Components First
Default to Server Components. Only add `'use client'` when you need hooks, event handlers, or browser APIs. Keep client bundle minimal.

## Behavior Rules

### No Lazy Work
- Implement ALL features completely, never stub or placeholder
- If a component needs 10 states, handle all 10
- Never truncate lists, skip edge cases, or leave TODO comments without implementing

### No Empty/Broken UI
- Every dynamic element must render with real data
- Before finishing any component: verify no empty states, no placeholder text, no missing fields
- If data is loading, show a proper skeleton/spinner
- If data is empty, show a proper empty state

### Self-Validation
After generating any component or page:
1. Verify all imports resolve
2. Verify TypeScript compiles with no errors
3. Verify all props are passed correctly
4. Verify RLS implications (who can see/do what?)

### Code Review Before Commit
Before any commit, mentally verify:
1. No hardcoded secrets or keys
2. No `any` types
3. No unused imports
4. RLS is respected (no service_role bypass)
5. Error states handled
6. Loading states handled
7. Mobile responsive

### Commit Style
- Imperative mood, max 50 char subject
- Body with bullet points explaining what and why
- Examples: `Add stock ledger transaction view with audit trail`, `Implement repair status workflow with ministry assignment`

## Domain Knowledge

### Church Context
- 17 ministries (including "Admin" — members get admin role)
- Items are either quantity-type (bulk stock) or individual-type (serial tracked)
- Supply requests have a configurable window (requests only accepted during open periods)
- Repairs default-assign to Engineering ministry
- Members have roles: Admin (full access), Staff (can manage inventory), Viewer (can request/report)

### Lessons from FlockTrack (predecessor app)
See `docs/knowledge/corrections.md` for past bugs to avoid:
- Never use `toISOString()` for date comparisons (UTC vs local timezone issue)
- Always preserve in-flight data during sync operations
- Validate all user input (especially dates — users enter wrong years)
- Delete operations must sync to server, not just local state
- Age/category classification must handle null/missing data gracefully

### Deploy Considerations
- Supabase free tier: connections timeout after inactivity. Cron keep-alive at `/api/cron/keep-alive` pings daily.
- `vercel.json` configures cron schedule
- Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET

## File Structure
```
src/
├── app/
│   ├── (auth)/          # Login, register, pending approval
│   ├── (dashboard)/     # All authenticated pages
│   ├── api/             # Route handlers (cron, mutations)
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Tailwind base
├── components/
│   ├── dashboard/       # Dashboard widgets
│   ├── inventory/       # Inventory CRUD
│   ├── layout/          # Nav, sidebar
│   ├── repairs/         # Repair reporting
│   ├── requests/        # Supply requests
│   └── ui/              # Primitives (Button, Card, Modal, etc.)
├── lib/                 # Supabase client, types, utils
└── middleware.ts        # Auth + role gating
```

## When Unsure
1. Check `docs/CONVENTIONS.md` for patterns
2. Check `TEST_PLAN.md` for expected behavior
3. Check `docs/knowledge/domain_facts.md` for gotchas
4. Check `docs/knowledge/corrections.md` for past mistakes to avoid
5. Check `docs/ref/` HTML files for architectural context

## Vision Toolkit (agent-vision-toolkit)

For screenshot analysis and image understanding, this repo includes the [agent-vision-toolkit](https://github.com/Anionex/agent-vision-toolkit).

### Quick Setup
Follow `tools/agent-vision-toolkit/AGENT_INSTALL.md` for full installation. The key pieces:
- `glance` — image Q&A (describe what's in a screenshot with task context)
- `ground` — locate UI elements by coordinates
- `detect` — inventory elements in a screenshot
- `ocr` via glance — extract text from long screenshots

### Screenshot Trigger ("sc")
When user says `sc`, use glance to analyze the most recent screenshot. See `docs/skills/get-pic.md` for trigger rules and `tools/agent-vision-toolkit/skills/vision-skills/SKILL.md` for the vision skill workflow.
