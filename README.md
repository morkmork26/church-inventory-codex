# Church Inventory — Codex Context Package

This repo contains all context, knowledge, and instructions needed for OpenAI Codex to work on the [JILGM Church Inventory](https://github.com/morkmork26/church-inventory) project.

## Structure

```
AGENTS.md                    # Codex system instructions (start here)
TEST_PLAN.md                 # Production-grade manual test plan
docs/
├── CURRENT_STATE.md         # What's implemented vs TODO
├── CONVENTIONS.md           # Coding style and patterns
├── knowledge/               # Domain facts, past bugs, workflow patterns
│   ├── active_state.md      # Full architecture map of predecessor app
│   ├── corrections.md       # Past bugs and how they were fixed
│   ├── domain_facts.md      # Technical gotchas and design decisions
│   └── workflow_patterns.md # Development workflow rules
└── ref/                     # Reference HTMLs and source code
    ├── supabase_stack_explainer.html  # FlockTrack vs Supabase mental model
    ├── migration_plan.html            # Migration phases from old to new
    ├── flocktrack-deepdive.html       # Technical deep-dive of old app
    ├── JILGM_App_Documentation.html   # Full system documentation
    └── flocktrack_source/             # Original FlockTrack source code
```

## Usage with Codex

Point Codex to `AGENTS.md` as the system instruction file. It contains:
- Project architecture and rules
- Coding conventions
- Domain knowledge pointers
- Past mistakes to avoid
- File structure reference

## Related Repos
- [church-inventory](https://github.com/morkmork26/church-inventory) — The actual app (Next.js + Supabase)
- [JILGM-Attendance](https://github.com/morkmork26/JILGM-Attendance) — Predecessor app (FlockTrack, Google Apps Script + PWA)
