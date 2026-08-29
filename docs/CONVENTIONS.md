# Coding Conventions — JILGM Church Inventory

## TypeScript
- Strict mode enabled
- All components typed with explicit props interfaces
- Use `type` over `interface` for component props (project convention)
- No `any` — use `unknown` + type guards when needed
- Prefer const assertions for literal types

## Next.js 14 App Router
- Server Components by default; add `'use client'` only when needed (hooks, event handlers, browser APIs)
- Colocate page-specific components in the route folder
- Shared components in `src/components/`
- API routes in `src/app/api/` — use Route Handlers (GET/POST/etc exports)
- Middleware in `src/middleware.ts` for auth gating
- Use `redirect()` from `next/navigation` for server-side redirects

## Supabase
- Client created via `createClientComponentClient()` or `createServerComponentClient()`
- Never expose service role key to client
- All data access goes through RLS — no `service_role` bypass in app code
- Mutations use server actions or API routes, never direct client writes for sensitive ops
- Auth state managed via Supabase Auth helpers for Next.js

## State Management
- **Server state:** TanStack Query (useQuery, useMutation, queryClient.invalidateQueries)
- **UI state:** Zustand stores (modals, filters, sidebar open/close)
- Never mix — server data lives in TanStack Query cache, UI flags in Zustand

## Styling
- Tailwind CSS v4 (utility-first)
- Component variants via `class-variance-authority` (cva) if used
- Dark mode support via Tailwind dark: prefix
- Consistent spacing scale: 4px increments
- shadcn/ui-style component patterns (composable, unstyled base)

## File Naming
- Components: PascalCase (`InventoryTable.tsx`)
- Utils/hooks: camelCase (`useInventory.ts`, `formatDate.ts`)
- Route files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Types: `types.ts` in relevant directory

## Error Handling
- Use error boundaries (`error.tsx`) per route segment
- API routes return proper HTTP status codes with typed error responses
- Client mutations show toast on error via TanStack Query's onError

## Testing Approach
- Manual testing per TEST_PLAN.md (no automated test framework yet)
- Verify RLS policies via Supabase dashboard or curl with different JWT roles
- Test mobile responsiveness via Chrome DevTools device emulation
