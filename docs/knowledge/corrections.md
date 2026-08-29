# FlockTrack - Corrections

## #1 | 2026-08-16 | today() was using UTC instead of local time
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** today() used toISOString().split('T')[0] which returns UTC date. For Philippines (UTC+8), services before 8AM were logged on the wrong date (Saturday instead of Sunday). Fixed to use getFullYear()/getMonth()/getDate(). Also fixed 6 other places using toISOString for date strings (checkInactiveMembers, getFirstSundays, showDetail, renderReports).
- **Context:** Never use toISOString for date comparison strings in this app
- **Expires:** never
- **Status:** active

## #2 | 2026-08-16 | saveMember was double-pushing to allMembers
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** Every new member was pushed to allMembers[] twice (once before the server call branch, once inside each branch). Also created orphaned IDB records when server returned a different ID. Fixed by removing early push, ensuring each branch pushes exactly once, and deleting old IDB record on ID change.
- **Context:** When modifying saveMember or member creation flow
- **Expires:** never
- **Status:** active

## #3 | 2026-08-16 | autoSync was wiping in-flight check-ins
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** autoSync deleted ALL local today attendance then rebuilt from server. If a check-in was in-flight (fire-and-forget fetch not yet received by server), it was lost during the 10s window. Fixed by capturing pending local check-ins (checkedInBy==='app', not on server) before delete, then re-inserting after server rebuild.
- **Context:** When modifying autoSync or attendance sync
- **Expires:** never
- **Status:** active

## #4 | 2026-08-16 | Member delete never synced to server
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** Frontend delete only removed from IDB and allMembers array. On next sync, member reappeared from server. Added deleteMember action to Code.gs backend and fire-and-forget call from frontend with pendingSync fallback.
- **Context:** Delete was reported as "not working" - this was the root cause
- **Expires:** never
- **Status:** active

## #5 | 2026-08-16 | getAge(null) returned 0, misclassifying members as Children
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** Members without birthday got age=0, classified as "Children" by getAgeGroup(). Fixed to return null, getAgeGroup returns "Unknown", reports skip Unknown in counts.
- **Context:** When modifying age group logic or reports
- **Expires:** never
- **Status:** active

## #6 | 2026-08-16 | Report double-counted first-time guests
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** newCount counted ALL members with status "First Time Guest". A first-timer on visit 2-3 (before graduation at visit 4) was counted in BOTH age group tallies AND newCount. Fixed newCount to only count literal first-visit guests (status=FTG AND attendance count<=1).
- **Context:** When modifying report generation
- **Expires:** never
- **Status:** active

## #7 | 2026-08-16 | Members registered with wrong birthday year (e.g. 2026)
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** Google Form date picker defaults to current year. Members who skip changing the year get birthday like "2026-07-15" (age 0). Fixed with: (1) saveMember validation - warns if age < 1 (customConfirm override for real babies), blocks if age > 120. (2) Member list shows warning icon (yellow triangle) next to members with suspicious birthday. (3) Member detail panel shows yellow banner with "Tap Edit to fix" for bad birthdays.
- **Context:** When modifying birthday handling, age group logic, or member display
- **Expires:** never
- **Status:** active

## #8 | 2026-08-16 | MLCR gap: CSS layout changes must verify DOM hierarchy
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** When MLCR reviews CSS layout changes (flex, grid, min-height, centering), MUST trace which elements are children vs siblings of the target container. The welcome div was placed outside #modeQR, then vertical centering was added to #modeQR, pushing the welcome text below the fold. MLCR reviewed CSS in isolation without verifying DOM structure. Rule: any CSS layout change to a container requires grep/verify of all elements that should be inside it.
- **Context:** Every MLCR involving CSS layout changes
- **Expires:** never
- **Status:** active

## #9 | 2026-08-17 | MLCR gap: forgot to update What's New on multiple pushes
- **Type:** correction
- **Scope:** flocktrack
- **Detail:** Despite workflow pattern #8 being saved ("always update What's New after every push"), missed updating CHANGELOG on 4 consecutive commits (welcome restyle, camera health fix, font size bump, scanner size bump). Rule: BEFORE running git push, verify CHANGELOG array has entries for the changes being pushed. If not, add them first. This is a pre-push checklist item, not optional.
- **Context:** Every git push to FlockTrack
- **Expires:** never
- **Status:** active
