# Get Pic — Screenshot Analysis Skill

Quickly view and analyze the most recent screenshot(s) from the user's screenshot directory.

## First-Time Setup (do this once)

Codex does not know where screenshots are stored. On first `sc` trigger:

1. **Auto-detect the screenshot directory.** Run these checks in order and use the first that exists and contains image files:
   - `~/Pictures/Screenshots/`
   - `~/OneDrive/Pictures/Screenshots/`
   - `~/Desktop/Screenshots/`
   - `~/Downloads/` (filter to .png/.jpg only)
   - On Windows: `%USERPROFILE%\Pictures\Screenshots\`
   - On Windows with OneDrive: `%USERPROFILE%\OneDrive\Pictures\Screenshots\`
   - On Mac: `~/Desktop/` (macOS saves screenshots to Desktop by default)

2. **If none found**, run:
   ```bash
   find ~ -maxdepth 4 -type d -iname "screenshots" 2>/dev/null | head -5
   ```
   Pick the one with the most recent .png/.jpg files.

3. **If still nothing**, ask the user: "Where does your system save screenshots? I'll remember it."

4. **Save the discovered path** in a project-level config (e.g., `.codex/settings.json` or a comment in AGENTS.md) so you never ask again.

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
