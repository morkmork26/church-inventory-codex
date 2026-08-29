# Get Pic — Screenshot Analysis Skill

Quickly view and analyze the most recent screenshot(s) from a configured directory.

## Setup
Set the screenshots directory for your environment:
```bash
export SCREENSHOTS_DIR="./screenshots"  # or wherever screenshots land
```

## Triggers
- `sc` — view and analyze the most recent screenshot
- `sc1`, `sc2`, `sc3` — view N most recent (highest number = most recent)
- `scl` — list 5 most recent with timestamps
- `sc "some text"` — view most recent, focus analysis on the quoted text/element

## Rules
1. On `sc` (no number): immediately get the most recent file, view it, analyze it. No questions.
2. If text accompanies `sc`, treat it as the question about the image.
3. If standalone, describe the image and relate to current conversation context.
4. Do NOT ask clarifying questions. Just analyze.

## Multiple Screenshots
Highest number = most recent. Resolve all in one listing:
```bash
ls -t "$SCREENSHOTS_DIR" | head -N
```
Map: scN = line 1 (newest), sc(N-1) = line 2, etc.

## Session Memory
Track viewed filenames within a session. If `sc` resolves to an already-viewed file, take the next most recent instead.
