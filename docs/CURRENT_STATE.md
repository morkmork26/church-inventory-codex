# Current State — JILGM Church Inventory

## Implemented (in src/)

### App Router Structure
- `(auth)/` — Auth pages (login, register, pending approval)
- `(dashboard)/` — Protected dashboard pages
- `api/` — API routes (cron keep-alive)

### Components
- `dashboard/` — Dashboard widgets
- `inventory/` — Inventory CRUD components
- `layout/` — Shared layout (nav, sidebar)
- `repairs/` — Repair reporting UI
- `requests/` — Supply request workflow UI
- `ui/` — Reusable UI primitives (shadcn-style)
- `providers.tsx` — Context providers (TanStack Query, Auth)

### Lib
- Supabase client setup
- Auth helpers
- Type definitions

### Database
- Supabase migrations in `/supabase/migrations/`
- RLS policies pre-configured
- Tables: assets, items, stock_transactions, supply_requests

## Tech Stack
- Next.js 14 (App Router, Server Components)
- Supabase (PostgreSQL + RLS + Auth)
- TanStack Query + Zustand
- Tailwind CSS v4
- Recharts (dashboard)
- TypeScript 5
- Deployed on Vercel

## Key Patterns
- Append-only stock ledger (SUM(delta) for current qty)
- Roles derived from Supabase Auth user metadata (not separate table)
- Middleware reads role from JWT, RLS enforces at DB level
- Free-text supply request justifications
- Daily cron keep-alive to prevent Supabase free-tier timeout

## TODO / Not Yet Implemented
- Review TEST_PLAN.md for full feature coverage gaps
- Notifications system (in-app)
- Storage location suggestions workflow
- Repair reporting full lifecycle
- Dashboard charts (Recharts)
- Mobile bottom nav
- Image upload to Supabase Storage
