# FlockTrack - Workflow Patterns

## #1 | 2026-08-16 | How to make frontend changes
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** 1. Clone: git clone using credentials from ~/.git-credentials (morkmork26 account) for github.com/morkmork26/JILGM-Attendance.git 2. Edit index.html (entire frontend is one file). 3. Bump sw.js cache version (jilgm-vXX). 4. git push origin main. 5. GitHub Pages auto-deploys in ~1 min.
- **Context:** Any frontend modification
- **Expires:** never
- **Status:** active

## #2 | 2026-08-16 | How to make backend changes
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** 1. Edit gas/Code.gs in repo. 2. User must manually copy to Apps Script editor (script.google.com). 3. Deploy > Manage deployments > edit existing > bump version number. 4. Deploy backend BEFORE pushing frontend if new endpoints are added.
- **Context:** Any backend modification
- **Expires:** never
- **Status:** active

## #3 | 2026-08-16 | How to add a new backend action
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** 1. Create the handler function. 2. Wire into doGet data switch (line ~86-100 area, case inside the e.parameter.data block). 3. Wire into doPost switch (line ~192-247 area). 4. Both are needed because frontend uses GET but doPost exists for compatibility.
- **Context:** Adding new API endpoints
- **Expires:** never
- **Status:** active

## #4 | 2026-08-16 | How to test changes
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** No test framework. Manual testing only. Live app at morkmork26.github.io/JILGM-Attendance/. For backend, use Apps Script editor test run or curl the deployed URL with ?action=getMembers. For frontend, push and test on phone (PWA behavior differs from desktop browser).
- **Context:** Verification after changes
- **Expires:** never
- **Status:** active

## #5 | 2026-08-16 | MLCR before every change
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** User prefers max-level CR before implementing changes. Workflow: 1. Read all affected code. 2. Draft fixes. 3. MLCR each fix against live app (max-level CR: trace every data path end-to-end, check for regressions, check transition risks, check deployment order). 4. If MLCR finds problems, revise and MLCR again. 5. Only implement after MLCR passes. 6. Verify with automated checks (Python assert scripts). 7. Push.
- **Context:** Every code change session
- **Expires:** never
- **Status:** active

## #6 | 2026-08-16 | Always update memory after changes
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** After every FlockTrack code change session: 1. Update active_state.md (version, SW cache version, last update date, what changed). 2. If new bugs were fixed, append to corrections.md. 3. If new domain knowledge was learned, append to domain_facts.md. 4. If architecture or endpoints changed, update active_state.md tables. This is mandatory, not optional.
- **Context:** End of every FlockTrack session
- **Expires:** never
- **Status:** active

## #7 | 2026-08-16 | User preferences for FlockTrack sessions
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** 1. Use bash-only for file modifications (no Edit tool). 2. MLCR before every change, CR on fixes before implementation. 3. Terminal output preferred over HTML files. 4. User communicates in mix of English and Filipino. 5. Use Python scripts for precise multi-point replacements. 6. Run automated verification (assert scripts) after applying fixes. 7. Git credentials are in ~/.git-credentials (morkmork26 account).
- **Context:** Every FlockTrack session
- **Expires:** never
- **Status:** active

## #8 | 2026-08-17 | Always update What's New changelog after changes
- **Type:** workflow_pattern
- **Scope:** flocktrack
- **Detail:** After every push to FlockTrack, update APP_VERSION and add entries to the CHANGELOG array in index.html. User explicitly requested this as a permanent rule. Also bump SW cache version in sw.js when doing version bumps.
- **Context:** Every FlockTrack commit
- **Expires:** never
- **Status:** active
