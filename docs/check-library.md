# SVL Check Library

Complete reference for all built-in checks. Each entry documents: what it detects, how it works, PASS/FAIL criteria, and auto-fix strategy.

---

## HTML Checks

### content_presence
**Detects:** Elements that exist in DOM but have no visible text content.
**How:** Finds all heading (h1-h6), paragraph (p), list item (li), table cell (td/th), and span elements. Checks each has stripped text length > 0 or contains a child element with content (img, svg, input).
**PASS:** All content elements have non-empty text or meaningful children.
**FAIL:** Any content element is empty or whitespace-only.
**Auto-fix:** Cannot auto-fix (content must come from source data). Reports element selector path for manual fix.

### element_count_match
**Detects:** Mismatch between expected item count and rendered item count.
**How:** Caller provides expected count and a CSS-style selector pattern. Script counts matching elements.
**PASS:** Rendered count equals expected count.
**FAIL:** Counts differ (reports expected vs actual).
**Auto-fix:** Cannot auto-fix (missing data must be re-generated). Reports the delta.

### js_function_defined
**Detects:** onclick/onchange/on* handlers referencing undefined JavaScript functions.
**How:** Extracts all function names from inline event handlers (onclick="functionName(...)"). Then scans all script blocks for function definitions (function name, const name =, let name =, var name =, name:function, name =>) .
**PASS:** Every referenced function name exists in a script block.
**FAIL:** One or more handlers reference non-existent functions.
**Auto-fix:** Cannot auto-fix (function must be implemented). Reports the missing function names and which elements reference them.

### js_toggle_works (CRITICAL CHECK)
**Detects:** Toggle patterns where CSS could override JS behavior, making toggles non-functional.
**How:** Multi-step verification:
1. Find all toggle patterns: elements whose style.display is manipulated by JS (regex for `.style.display`)
2. For each toggled element ID/selector, verify the element EXISTS in the HTML
3. Check if ANY CSS rule targets that element with `display: none !important` or `display: block !important` outside of `@media print`
4. Check that the JS uses `element.style.display = 'none'/'block'/''/flex'` (inline style) rather than `element.classList.add/remove/toggle`
5. Verify no CSS transition on `display` property (display is not animatable; presence suggests confusion)
**PASS:** All toggles use inline style.display AND no CSS !important conflicts exist on target elements.
**FAIL:** Either (a) class-based toggle detected, or (b) CSS !important on display for toggled element, or (c) target element ID doesn't exist.
**Auto-fix:** 
- For (a): Replace classList toggle with style.display assignment
- For (b): Remove the !important declaration (or scope it to @media print)
- For (c): Cannot fix (element must be created)

### css_no_conflict
**Detects:** CSS rules with `display:none!important` or `display:block!important` that could conflict with JS toggle operations.
**How:** Parses all style blocks. Finds any rule containing `display` with `!important` that is NOT inside `@media print`.
**PASS:** No conflicting !important display rules outside print media.
**FAIL:** One or more rules found.
**Auto-fix:** Remove `!important` from the display declaration, or wrap it in `@media print {}` if it appears print-related.

### links_resolve
**Detects:** Internal anchor links (href="#something") pointing to non-existent IDs.
**How:** Collects all href values starting with "#". Collects all id attributes. Checks every href target exists as an id.
**PASS:** Every internal link has a matching ID target.
**FAIL:** One or more dead links found.
**Auto-fix:** Cannot auto-fix (either the link or the target needs human decision). Reports pairs.

### no_empty_containers
**Detects:** Div/section/article/main/aside elements with zero text content and no meaningful children (img, svg, canvas, video, iframe, input).
**How:** Finds all container elements. For each, checks if stripped text content > 0 or contains media/input children.
**PASS:** All containers have content or meaningful children.
**FAIL:** Empty containers found.
**Auto-fix:** Adds `style="display:none"` to empty containers (hides them). Flags for content review.

### responsive_breakpoints
**Detects:** Lack of responsive design (no @media queries for different screen sizes).
**How:** Counts `@media` rules that include width-based conditions (min-width, max-width).
**PASS:** At least 2 width-based @media rules found.
**FAIL:** Fewer than 2 responsive breakpoints.
**Auto-fix:** Cannot auto-fix (responsive design requires layout decisions). Reports current count.

### no_placeholder_text
**Detects:** Placeholder or development text left in production output.
**How:** Searches all text content for patterns: "lorem ipsum", "TODO", "FIXME", "placeholder", "coming soon", "TBD", "insert here", "example text", "[REPLACE".
**PASS:** No placeholder patterns found.
**FAIL:** One or more placeholder strings detected.
**Auto-fix:** Cannot auto-fix (real content needed). Reports locations.

### data_truncation
**Detects:** Silent data loss where fewer items rendered than expected.
**How:** Caller provides expected count via --expected-items flag. Script counts primary repeating elements (cards, rows, sections based on heuristic: most-repeated class name with >3 instances).
**PASS:** Rendered count >= expected count.
**FAIL:** Rendered count < expected count.
**Auto-fix:** Cannot auto-fix. Reports expected vs actual with the selector used for counting.

### print_css_exists
**Detects:** Missing print stylesheet for content that should be printable.
**How:** Searches for `@media print` in style blocks or linked print stylesheets.
**PASS:** At least one @media print rule exists.
**FAIL:** No print styles found.
**Auto-fix:** Adds a basic `@media print { .no-print { display: none; } }` block. Minimal but functional.

### accessibility_basics
**Detects:** Missing accessibility attributes on interactive/media elements.
**How:** Checks: (1) img elements have alt attribute, (2) button elements have text content or aria-label, (3) input elements have associated label or aria-label, (4) html element has lang attribute.
**PASS:** All checked elements have required attributes.
**FAIL:** One or more elements missing accessibility attributes.
**Auto-fix:** Adds `alt=""` to decorative images, `aria-label="button"` to empty buttons (conservative defaults). Flags for human review.

### file_size_budget
**Detects:** Oversized output files that may cause performance issues.
**How:** Checks file size in bytes. Warn threshold: 1.5MB. Fail threshold: 3MB.
**PASS:** File size < 1.5MB.
**WARN:** File size between 1.5MB and 3MB.
**FAIL:** File size > 3MB without evidence of lazy-loading (no `loading="lazy"` on images, no IntersectionObserver in scripts).
**Auto-fix:** Adds `loading="lazy"` to all img tags. If still over budget, reports for manual optimization.

---

## SVG Checks

### no_overlapping_elements
**Detects:** Positioned elements with overlapping bounding boxes (unexpected collisions).
**How:** Extracts x, y, width, height from rect/text/circle/ellipse elements. Checks for intersections between siblings at the same hierarchy level.
**PASS:** No unexpected overlaps (or overlaps are intentional layering).
**FAIL:** Sibling elements overlap by >50% area.
**Auto-fix:** Cannot auto-fix (layout decision needed). Reports overlapping pairs with coordinates.

### text_within_bounds
**Detects:** Text elements positioned outside their parent container boundaries.
**How:** For text elements inside rect/g containers, checks if text x,y falls within parent bounds.
**PASS:** All text within parent boundaries.
**FAIL:** Text positioned outside container.
**Auto-fix:** Clamps text position to parent bounds with 5px padding.

### viewbox_set
**Detects:** SVG elements missing the viewBox attribute (causes scaling issues).
**How:** Checks root SVG element for viewBox attribute presence.
**PASS:** viewBox is set.
**FAIL:** viewBox missing.
**Auto-fix:** Calculates viewBox from width/height attributes: `viewBox="0 0 {width} {height}"`.

---

## Universal Checks

### no_secrets
**Detects:** Accidentally included credentials, API keys, or tokens.
**How:** Regex patterns for: API key formats (long alphanumeric strings prefixed with key identifiers), Bearer tokens, password= assignments, AWS keys (AKIA...), private key headers (BEGIN RSA/EC/PRIVATE KEY).
**PASS:** No credential patterns found.
**FAIL:** Potential credential detected.
**Auto-fix:** Cannot auto-fix (must verify if real credential). Reports location and pattern matched. CRITICAL priority.

### encoding_valid
**Detects:** Invalid UTF-8 encoding or mixed encodings.
**How:** Attempts to decode entire file as UTF-8. Checks for BOM presence.
**PASS:** File is valid UTF-8.
**FAIL:** Decoding error at specific byte offset.
**Auto-fix:** Replaces invalid bytes with UTF-8 replacement character. Flags locations.

### no_binary_garbage
**Detects:** Null bytes or control characters in text output files.
**How:** Scans for bytes 0x00-0x08, 0x0E-0x1F (excluding tab, newline, carriage return).
**PASS:** No unexpected control characters.
**FAIL:** Binary content found in text file.
**Auto-fix:** Strips control characters. Reports count removed.

---

## Output Format

All checks report in JSON:
```json
[
  {
    "check": "js_toggle_works",
    "status": "FAIL",
    "detail": "Element #sidebar toggled via classList but has CSS rule .sidebar{display:none!important}",
    "auto_fix_available": true,
    "fixed": false
  }
]
```

Status values: `PASS`, `FAIL`, `WARN`, `SKIP` (not applicable to this artifact type).
