# FlockTrack - Domain Facts

## #1 | 2026-08-16 | All mutations go through GET requests
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** iOS Safari drops POST body on Apps Script 302 redirect. All write operations use GET with ?data=encodeURIComponent(JSON.stringify(payload)). doPost exists but frontend never uses it.
- **Context:** When adding new endpoints or debugging network issues
- **Expires:** never
- **Status:** active

## #2 | 2026-08-16 | Frontend date functions use local time (PHT)
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** today() and localDateStr() return YYYY-MM-DD in local timezone (Philippines UTC+8). Backend normDate() uses Session.getScriptTimeZone(). Both must agree. Never use toISOString().split('T')[0] for date strings - that returns UTC.
- **Context:** Any code that computes or compares dates
- **Expires:** never
- **Status:** active

## #3 | 2026-08-16 | Member IDs have two formats
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** Server-created members have IDs like MEM-001, MEM-042. Locally-created (offline) members have IDs like m1690000000000 (timestamp-based). On successful server sync, local ID is replaced with server ID and old IDB record is deleted.
- **Context:** When working with member lookups, QR codes, or sync logic
- **Expires:** never
- **Status:** active

## #4 | 2026-08-16 | Service worker cache must be manually bumped
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** sw.js uses a static cache name (currently jilgm-v51). When deploying frontend changes, increment the version number in sw.js or users get stale cached content. CDN scripts (html5-qrcode, qrcodejs) are cached non-blocking in install + runtime cached on first fetch.
- **Context:** Every frontend deployment
- **Expires:** never
- **Status:** active

## #5 | 2026-08-16 | No authentication on backend
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** Apps Script Web App deployed as "Anyone can access." Device access control is frontend-only gating. All backend endpoints are unauthenticated. Accepted risk for a small church (200 members). Script URL is only shared with trusted ushers.
- **Context:** When evaluating security or adding new endpoints
- **Expires:** never
- **Status:** active

## #6 | 2026-08-16 | Sheet ID should not be in public repo
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** Code.gs has the Google Sheet ID hardcoded. Repo is public. Should migrate to PropertiesService.getScriptProperties(). Low urgency since backend has no auth anyway, but PII risk exists (member data).
- **Context:** Security review
- **Expires:** never
- **Status:** active

## #7 | 2026-08-16 | Deploy order: backend first, then frontend
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** Code.gs is deployed via Apps Script editor (new deployment version). index.html + sw.js are deployed via git push to GitHub Pages. Backend first is always safe. Frontend first may cause "Unknown action" errors for new endpoints during the gap.
- **Context:** Every deployment
- **Expires:** never
- **Status:** active

## #8 | 2026-08-16 | LockService protects member ID generation
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** addMember() and onFormSubmit() use LockService.getScriptLock() with 10s timeout around ID generation + appendRow to prevent MEM-XXX collisions from concurrent calls.
- **Context:** When modifying addMember or onFormSubmit
- **Expires:** never
- **Status:** active

## #9 | 2026-08-16 | autoSync preserves pending local check-ins
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** autoSync (30s interval) does delete-and-replace from server BUT captures local-only check-ins (checkedInBy==='app' and not on server) before deleting, then re-inserts them after server data. This prevents race condition where in-flight check-ins are lost.
- **Context:** When modifying sync logic
- **Expires:** never
- **Status:** active

## #10 | 2026-08-16 | Outreach-specific attendance rules
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** Sto. Tomas (main): 8 weekly Sundays. Tanauan: 8 first-Sundays-of-month. Naujan/Socorro: never auto-deactivated. These rules are hardcoded in checkInactiveMembers(). Config not exposed to UI.
- **Context:** When modifying inactivity logic or adding new outreaches
- **Expires:** never
- **Status:** active

## #11 | 2026-08-16 | Security issues identified and intentionally skipped
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** 9 security issues found in MLCR (SEC-01 to SEC-09): unauthenticated backend, hardcoded Sheet ID in public repo, spoofable device ID, sequential QR codes, XSS via innerHTML, mutations via GET, full DB in report emails, no input length limits, sendDuplicateNotice leaks member ID. ALL intentionally skipped because threat model is a small church (~200 members), script URL only shared with trusted ushers. Revisit if app scales beyond the church or goes multi-tenant.
- **Context:** Do NOT re-analyze these in future sessions. They are accepted risks.
- **Expires:** never
- **Status:** active

## #12 | 2026-08-16 | IndexedDB schema
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** DB_NAME='jilgm_attendance', DB_VERSION=1. Four object stores: (1) members - keyPath:'id', (2) attendance - keyPath:'id' autoIncrement, index 'date' on 'date' field, (3) pendingSync - keyPath:'id' autoIncrement, (4) settings - keyPath:'key'. localStorage keys: jilgm_deviceId (device fingerprint), jilgm_removed (removed check-ins blacklist with 5-min TTL).
- **Context:** When modifying offline storage or sync logic
- **Expires:** never
- **Status:** active

## #13 | 2026-08-16 | Known issues intentionally not fixed
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** Three issues from MLCR were analyzed and skipped: (1) LOGIC-08: Streak calculation off-by-one in edge cases - cosmetic badge, complex logic, high risk of new bugs. (2) PERF-03: Full DOM rebuild on avatar grid every render - at 200 members this is fast enough (~16ms), virtual DOM would be over-engineering. (3) PWA-02: No auto cache-busting - process issue (remember to bump sw.js version), code fix would over-complicate. Accept these as known limitations.
- **Context:** Do NOT re-analyze these. They are accepted tradeoffs.
- **Expires:** never
- **Status:** active

## #14 | 2026-08-16 | Camera picker replaces Flip button
- **Type:** domain_fact
- **Scope:** flocktrack
- **Detail:** QR scanner now enumerates all cameras via enumerateDevices() and shows a bottom sheet picker. Selected camera deviceId persisted in localStorage (jilgm_cameraId). Falls back to facingMode:'environment' if saved device unavailable. Supports Windows 11 Phone Link virtual camera for using phone as external scanner on laptop. Old flipCamera() function removed.
- **Context:** When modifying QR scanner, camera handling, or adding camera features
- **Expires:** never
- **Status:** active
