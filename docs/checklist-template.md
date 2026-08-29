# SVL Requirement Checklist for: [ARTIFACT NAME]

> Fill this BEFORE building. Every checkbox becomes a programmatic check after build.

## Content Requirements
- [ ] All input data items rendered (expected count: ___)
- [ ] No empty sections or cards
- [ ] All headings/titles populated with actual text
- [ ] All descriptions/body text present (no "coming soon" or placeholders)
- [ ] Images/icons have valid sources or inline SVG
- [ ] Data values match source (spot-check at least 3 entries)

## Structural Requirements
- [ ] Valid markup (HTML/SVG/XML well-formed, no unclosed tags)
- [ ] All internal links (#anchors) resolve to existing IDs
- [ ] No duplicate IDs in the document
- [ ] Proper nesting (no block elements inside inline elements)
- [ ] Character encoding is UTF-8, declared in meta/header
- [ ] File size within budget (warn >1.5MB, fail >3MB without lazy-load)

## Functional Requirements
- [ ] Every onclick/onchange handler references a defined JS function
- [ ] Toggle elements use inline style.display (NOT class-based)
- [ ] No CSS !important on display property outside @media print
- [ ] Collapsible sections expand and collapse (target element exists, JS toggles style.display)
- [ ] Navigation links scroll to correct sections
- [ ] Search/filter functions produce results (if applicable)
- [ ] Theme toggle switches colors for all elements (if applicable)

## Visual Requirements
- [ ] No zero-height/zero-width visible containers
- [ ] Text is readable (sufficient contrast implied by color scheme)
- [ ] No overlapping positioned elements (absolute/fixed elements checked)
- [ ] Responsive: at least 2 @media breakpoints for mobile/tablet
- [ ] Print stylesheet exists if content is printable (@media print)
- [ ] No horizontal scrollbar at common viewport widths

## Data Fidelity
- [ ] Input item count matches output rendered count (no silent drops)
- [ ] Numerical values in output match source data
- [ ] Sort order preserved (or explicitly re-sorted as intended)
- [ ] No duplicate entries (unless source has duplicates)
- [ ] Special characters rendered correctly (not escaped as entities in visible text)

## Security/Hygiene
- [ ] No API keys, tokens, or passwords in output
- [ ] No console.log debugging statements left in production
- [ ] No commented-out dead code blocks (>10 lines)
- [ ] No external CDN dependencies that could break offline (or acceptable with fallback)
