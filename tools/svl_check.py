# /// script
# requires-python = ">=3.8"
# dependencies = []
# [project]
# name = "svl-check"
# version = "1.0.0"
# description = "Universal Self-Validation Loop checker for HTML/SVG artifacts"
# ///
"""
SVL Check - Universal Self-Validation Loop
Validates HTML/SVG artifacts against quality checks.
Usage: python3 svl_check.py <file> [--fix] [--expected-sections N] [--expected-items N] [--json]
"""

import sys
import os
import re
import json
from html.parser import HTMLParser
from collections import defaultdict

# ---------------------------------------------------------------------------
# HTML Parser
# ---------------------------------------------------------------------------

class SVLHTMLParser(HTMLParser):
    """Parse HTML into a structured representation for validation."""

    def __init__(self):
        super().__init__()
        self.elements = []  # list of {tag, attrs, text, children_tags}
        self.tag_stack = []
        self.current_text = []
        self.ids = set()
        self.hrefs = []
        self.event_handlers = []  # (element_tag, handler_attr, function_name)
        self.style_blocks = []
        self.script_blocks = []
        self.in_style = False
        self.in_script = False
        self.class_counts = defaultdict(int)
        self.img_elements = []
        self.button_elements = []
        self.input_elements = []
        self.container_elements = []  # divs, sections, articles
        self.all_elements_by_id = {}
        self.tag_counts = defaultdict(int)
        self.has_lang = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.tag_counts[tag] += 1

        if tag == 'html' and 'lang' in attrs_dict:
            self.has_lang = True

        # Track IDs
        if 'id' in attrs_dict:
            self.ids.add(attrs_dict['id'])
            self.all_elements_by_id[attrs_dict['id']] = tag

        # Track hrefs
        if 'href' in attrs_dict and attrs_dict['href'].startswith('#'):
            self.hrefs.append(attrs_dict['href'][1:])

        # Track classes
        if 'class' in attrs_dict:
            for cls in attrs_dict['class'].split():
                self.class_counts[cls] += 1

        # Track event handlers
        for attr_name, attr_val in attrs:
            if attr_name.startswith('on') and attr_val:
                # Extract function name from handler value
                match = re.match(r'(\w+)\s*\(', attr_val)
                if match:
                    self.event_handlers.append((tag, attr_name, match.group(1)))

        # Track specific elements
        if tag == 'img':
            self.img_elements.append(attrs_dict)
        elif tag == 'button':
            self.button_elements.append({'attrs': attrs_dict, 'text': ''})
        elif tag == 'input':
            self.input_elements.append(attrs_dict)
        elif tag in ('div', 'section', 'article', 'main', 'aside'):
            self.container_elements.append({'tag': tag, 'attrs': attrs_dict, 'text': '', 'has_media': False})

        # Track style/script blocks
        if tag == 'style':
            self.in_style = True
            self.current_text = []
        elif tag == 'script':
            self.in_script = True
            self.current_text = []

        self.tag_stack.append(tag)

    def handle_endtag(self, tag):
        if tag == 'style' and self.in_style:
            self.style_blocks.append(''.join(self.current_text))
            self.in_style = False
            self.current_text = []
        elif tag == 'script' and self.in_script:
            self.script_blocks.append(''.join(self.current_text))
            self.in_script = False
            self.current_text = []

        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()

    def handle_data(self, data):
        if self.in_style or self.in_script:
            self.current_text.append(data)
        else:
            # Attribute text to current container/button
            stripped = data.strip()
            if stripped:
                if self.button_elements:
                    # Find innermost button in stack
                    for elem in reversed(self.button_elements):
                        if not elem['text']:
                            elem['text'] = stripped
                            break
                if self.container_elements:
                    self.container_elements[-1]['text'] += stripped

    def handle_comment(self, data):
        pass


# ---------------------------------------------------------------------------
# Check Functions
# ---------------------------------------------------------------------------

def check_js_function_defined(parser):
    """Every onclick/onchange handler must reference a defined JS function."""
    if not parser.event_handlers:
        return {"check": "js_function_defined", "status": "SKIP", "detail": "No event handlers found", "auto_fix_available": False}

    # Collect all defined function names from script blocks
    defined_functions = set()
    all_scripts = '\n'.join(parser.script_blocks)

    # Match: function name(, const/let/var name =, name: function, arrow functions
    patterns = [
        r'function\s+(\w+)',
        r'(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\()',
        r'(\w+)\s*:\s*function',
        r'(?:const|let|var)\s+(\w+)\s*=\s*\w+\s*=>'
    ]
    for pat in patterns:
        defined_functions.update(re.findall(pat, all_scripts))

    # Also add common built-in functions that don't need definition
    builtins = {'alert', 'confirm', 'prompt', 'console', 'window', 'document',
                'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
                'parseInt', 'parseFloat', 'history', 'location', 'navigator',
                'event', 'this', 'return', 'void'}
    defined_functions.update(builtins)

    missing = []
    for tag, attr, func_name in parser.event_handlers:
        if func_name not in defined_functions:
            missing.append(f"{tag}[{attr}] references undefined '{func_name}'")

    if missing:
        return {"check": "js_function_defined", "status": "FAIL",
                "detail": "; ".join(missing[:10]), "auto_fix_available": False}
    return {"check": "js_function_defined", "status": "PASS", "detail": f"All {len(parser.event_handlers)} handlers reference defined functions", "auto_fix_available": False}


def check_js_toggle_works(content, parser):
    """CRITICAL: Detect toggle patterns where CSS could override JS behavior."""
    issues = []
    all_scripts = '\n'.join(parser.script_blocks)
    all_styles = '\n'.join(parser.style_blocks)

    # 1. Find class-based toggles (BAD pattern)
    class_toggle_patterns = [
        r'\.classList\.(add|remove|toggle)\s*\(\s*[\'"]([^\'"]+)',
        r'\.className\s*[+=]',
    ]
    for pat in class_toggle_patterns:
        matches = re.findall(pat, all_scripts)
        if matches:
            if isinstance(matches[0], tuple):
                for action, cls in matches:
                    issues.append(f"CLASS-BASED TOGGLE: classList.{action}('{cls}') - use style.display instead")
            else:
                issues.append("CLASS-BASED TOGGLE: className assignment detected - use style.display instead")

    # 2. Find style.display toggles (GOOD) and verify targets exist
    display_toggles = re.findall(
        r'(?:getElementById|querySelector)\s*\(\s*[\'"]([#\w\-\.]+)[\'"]\s*\).*?\.style\.display',
        all_scripts, re.DOTALL
    )
    for target_id in display_toggles:
        clean_id = target_id.lstrip('#').split('.')[0]
        if clean_id and clean_id not in parser.ids:
            # Check if it might be a class selector
            if clean_id not in [c for c in parser.class_counts]:
                issues.append(f"MISSING TARGET: toggle targets '{clean_id}' but element not found in DOM")

    # 3. Check for CSS !important on display property outside @media print
    # Remove @media print blocks first
    styles_no_print = re.sub(r'@media\s+print\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}', '', all_styles)
    important_display = re.findall(r'([^{]+)\{[^}]*display\s*:\s*[^;]*!important[^}]*\}', styles_no_print)
    for selector in important_display:
        selector = selector.strip().split('\n')[-1].strip()
        if selector:
            issues.append(f"CSS CONFLICT: '{selector}' has display:!important outside @media print")

    if not issues and not all_scripts:
        return {"check": "js_toggle_works", "status": "SKIP", "detail": "No JavaScript found", "auto_fix_available": False}

    if issues:
        return {"check": "js_toggle_works", "status": "FAIL",
                "detail": "; ".join(issues[:10]), "auto_fix_available": True}
    return {"check": "js_toggle_works", "status": "PASS",
            "detail": "All toggles use inline style.display, no CSS conflicts", "auto_fix_available": False}


def check_css_no_conflict(parser):
    """No display:!important outside @media print."""
    all_styles = '\n'.join(parser.style_blocks)
    if not all_styles.strip():
        return {"check": "css_no_conflict", "status": "SKIP", "detail": "No styles found", "auto_fix_available": False}

    # Remove @media print blocks
    styles_no_print = re.sub(r'@media\s+print\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}', '', all_styles)
    conflicts = re.findall(r'display\s*:\s*[^;]*!important', styles_no_print)

    if conflicts:
        return {"check": "css_no_conflict", "status": "FAIL",
                "detail": f"Found {len(conflicts)} display:!important rules outside @media print",
                "auto_fix_available": True}
    return {"check": "css_no_conflict", "status": "PASS", "detail": "No conflicting !important display rules", "auto_fix_available": False}


def check_links_resolve(parser):
    """Every href="#id" must have a matching id in the document."""
    if not parser.hrefs:
        return {"check": "links_resolve", "status": "SKIP", "detail": "No internal links found", "auto_fix_available": False}

    broken = [h for h in parser.hrefs if h and h not in parser.ids]
    if broken:
        return {"check": "links_resolve", "status": "FAIL",
                "detail": f"Broken links: {', '.join(broken[:10])}", "auto_fix_available": False}
    return {"check": "links_resolve", "status": "PASS", "detail": f"All {len(parser.hrefs)} internal links resolve", "auto_fix_available": False}


def check_no_empty_containers(content, parser):
    """No div/section with zero content and no media children."""
    # Use regex to find empty containers more reliably
    empty_pattern = r'<(div|section|article|aside|main)([^>]*)>\s*</(div|section|article|aside|main)>'
    empties = re.findall(empty_pattern, content)

    if empties:
        return {"check": "no_empty_containers", "status": "FAIL",
                "detail": f"Found {len(empties)} completely empty container elements",
                "auto_fix_available": True}
    return {"check": "no_empty_containers", "status": "PASS", "detail": "No empty containers", "auto_fix_available": False}


def check_responsive_breakpoints(parser):
    """At least 2 @media width-based rules."""
    all_styles = '\n'.join(parser.style_blocks)
    breakpoints = re.findall(r'@media[^{]*(?:min-width|max-width)[^{]*\{', all_styles)

    if len(breakpoints) < 2:
        return {"check": "responsive_breakpoints", "status": "FAIL",
                "detail": f"Only {len(breakpoints)} responsive breakpoint(s) found (need >= 2)",
                "auto_fix_available": False}
    return {"check": "responsive_breakpoints", "status": "PASS", "detail": f"Found {len(breakpoints)} responsive breakpoints", "auto_fix_available": False}


def check_no_placeholder_text(content):
    """No development/placeholder text in output."""
    placeholders = ['lorem ipsum', 'todo:', 'fixme:', 'placeholder', 'coming soon',
                    'tbd', 'insert here', 'example text', '[replace', 'xxx', 'yyy']

    # Remove script and style blocks for this check
    clean = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.DOTALL | re.IGNORECASE)
    clean_lower = clean.lower()

    found = []
    for ph in placeholders:
        if ph in clean_lower:
            # Get context
            idx = clean_lower.index(ph)
            context = clean[max(0, idx-20):idx+len(ph)+20].strip()
            # Filter out false positives (e.g. "example" in legitimate context)
            if ph in ('example text',) and 'example' in clean_lower[:idx].split('\n')[-1]:
                continue
            found.append(f"'{ph}' near: ...{context}...")

    if found:
        return {"check": "no_placeholder_text", "status": "FAIL",
                "detail": "; ".join(found[:5]), "auto_fix_available": False}
    return {"check": "no_placeholder_text", "status": "PASS", "detail": "No placeholder text found", "auto_fix_available": False}


def check_data_truncation(content, parser, expected_items=None):
    """Input item count must match output rendered count."""
    if expected_items is None:
        return {"check": "data_truncation", "status": "SKIP", "detail": "No expected count provided (use --expected-items N)", "auto_fix_available": False}

    # Heuristic: find the most-repeated class that appears 3+ times (likely the repeating item)
    candidates = [(cls, count) for cls, count in parser.class_counts.items() if count >= 3]
    candidates.sort(key=lambda x: -x[1])

    if candidates:
        best_class, best_count = candidates[0]
        # Try a few common item-like classes first
        item_classes = ['card', 'item', 'section', 'lesson', 'entry', 'row', 'slide']
        for ic in item_classes:
            for cls, count in candidates:
                if ic in cls.lower():
                    best_class, best_count = cls, count
                    break

        if best_count < expected_items:
            return {"check": "data_truncation", "status": "FAIL",
                    "detail": f"Expected {expected_items} items, found {best_count} (counted class='{best_class}')",
                    "auto_fix_available": False}
        return {"check": "data_truncation", "status": "PASS",
                "detail": f"Found {best_count} items (class='{best_class}'), expected {expected_items}",
                "auto_fix_available": False}

    return {"check": "data_truncation", "status": "WARN",
            "detail": "Could not identify repeating element pattern to count", "auto_fix_available": False}


def check_print_css(parser):
    """Check for @media print rules."""
    all_styles = '\n'.join(parser.style_blocks)
    if '@media print' in all_styles or "@media print" in all_styles:
        return {"check": "print_css_exists", "status": "PASS", "detail": "@media print rules present", "auto_fix_available": False}
    return {"check": "print_css_exists", "status": "WARN",
            "detail": "No @media print rules found", "auto_fix_available": True}


def check_accessibility(parser):
    """Basic accessibility: img alt, button text, html lang."""
    issues = []

    # Check images for alt
    imgs_no_alt = [img for img in parser.img_elements if 'alt' not in img]
    if imgs_no_alt:
        issues.append(f"{len(imgs_no_alt)} img element(s) missing alt attribute")

    # Check html lang
    if not parser.has_lang:
        issues.append("html element missing lang attribute")

    if issues:
        return {"check": "accessibility_basics", "status": "WARN",
                "detail": "; ".join(issues), "auto_fix_available": True}
    return {"check": "accessibility_basics", "status": "PASS", "detail": "Basic accessibility checks pass", "auto_fix_available": False}


def check_file_size(filepath):
    """Warn >1.5MB, fail >3MB without lazy-loading."""
    size = os.path.getsize(filepath)
    size_mb = size / (1024 * 1024)

    if size_mb > 3.0:
        # Check for lazy loading
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        has_lazy = 'loading="lazy"' in content or 'IntersectionObserver' in content
        if not has_lazy:
            return {"check": "file_size_budget", "status": "FAIL",
                    "detail": f"File is {size_mb:.1f}MB (>3MB) with no lazy-loading detected",
                    "auto_fix_available": True}
        return {"check": "file_size_budget", "status": "WARN",
                "detail": f"File is {size_mb:.1f}MB but has lazy-loading", "auto_fix_available": False}
    elif size_mb > 1.5:
        return {"check": "file_size_budget", "status": "WARN",
                "detail": f"File is {size_mb:.1f}MB (approaching 3MB limit)", "auto_fix_available": False}
    return {"check": "file_size_budget", "status": "PASS", "detail": f"File size: {size_mb:.2f}MB", "auto_fix_available": False}


def check_no_secrets(content):
    """No API keys, tokens, or passwords in output."""
    patterns = [
        (r'(?:api[_-]?key|apikey)\s*[=:]\s*["\']?[A-Za-z0-9_\-]{20,}', 'API key'),
        (r'Bearer\s+[A-Za-z0-9_\-\.]{20,}', 'Bearer token'),
        (r'(?:password|passwd|pwd)\s*[=:]\s*["\'][^"\']{4,}', 'Password'),
        (r'AKIA[0-9A-Z]{16}', 'AWS access key'),
        (r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----', 'Private key'),
        (r'(?:sk|pk)[-_](?:live|test)[-_][A-Za-z0-9]{20,}', 'Stripe-style key'),
    ]

    found = []
    # Skip script blocks that define the patterns themselves (meta/documentation)
    for pat, name in patterns:
        matches = re.findall(pat, content)
        if matches:
            found.append(f"{name} pattern detected ({len(matches)} occurrence(s))")

    if found:
        return {"check": "no_secrets", "status": "FAIL",
                "detail": "; ".join(found), "auto_fix_available": False}
    return {"check": "no_secrets", "status": "PASS", "detail": "No credential patterns found", "auto_fix_available": False}


def check_encoding(filepath):
    """Verify valid UTF-8 encoding."""
    try:
        with open(filepath, 'rb') as f:
            raw = f.read()
        raw.decode('utf-8')
        return {"check": "encoding_valid", "status": "PASS", "detail": "Valid UTF-8", "auto_fix_available": False}
    except UnicodeDecodeError as e:
        return {"check": "encoding_valid", "status": "FAIL",
                "detail": f"Invalid UTF-8 at byte {e.start}: {e.reason}", "auto_fix_available": True}


def check_no_binary(content):
    """No null bytes or unexpected control characters."""
    bad_chars = []
    for i, ch in enumerate(content[:50000]):  # Check first 50K chars for performance
        code = ord(ch)
        if code == 0 or (0x01 <= code <= 0x08) or (0x0E <= code <= 0x1F):
            bad_chars.append((i, hex(code)))
            if len(bad_chars) >= 5:
                break

    if bad_chars:
        return {"check": "no_binary_garbage", "status": "FAIL",
                "detail": f"Found {len(bad_chars)} control character(s), first at position {bad_chars[0][0]}",
                "auto_fix_available": True}
    return {"check": "no_binary_garbage", "status": "PASS", "detail": "No binary garbage", "auto_fix_available": False}


# ---------------------------------------------------------------------------
# Auto-Fix Functions
# ---------------------------------------------------------------------------

def apply_fixes(filepath, content, results):
    """Apply auto-fixes for failing checks. Returns modified content."""
    modified = content
    fixes_applied = []

    for result in results:
        if result['status'] != 'FAIL' or not result.get('auto_fix_available'):
            continue

        check_name = result['check']

        if check_name == 'js_toggle_works':
            # Fix class-based toggles -> inline style
            # Replace classList.toggle('classname') patterns with style.display toggling
            pattern = r"([\w.]+)\.classList\.toggle\s*\(\s*'([^']+)'\s*\)"
            def replace_toggle(m):
                elem = m.group(1)
                return f"{elem}.style.display = ({elem}.style.display === 'none') ? '' : 'none'"
            new_content = re.sub(pattern, replace_toggle, modified)
            if new_content != modified:
                modified = new_content
                fixes_applied.append('js_toggle_works: converted classList.toggle to style.display')

            # Remove !important from display outside @media print
            # This is a simplified fix - removes !important from display declarations
            modified = re.sub(r'(display\s*:\s*[^;!]+)!important', r'\1', modified)
            if modified != content:
                fixes_applied.append('css_no_conflict: removed !important from display rules')

        elif check_name == 'css_no_conflict':
            modified = re.sub(r'(display\s*:\s*[^;!]+)!important', r'\1', modified)
            if modified != content:
                fixes_applied.append('css_no_conflict: removed !important from display rules')

        elif check_name == 'no_empty_containers':
            # Hide empty containers
            modified = re.sub(
                r'<(div|section|article|aside|main)([^>]*)>\s*</(div|section|article|aside|main)>',
                r'<\1\2 style="display:none"></\3>',
                modified
            )
            if modified != content:
                fixes_applied.append('no_empty_containers: hidden empty containers')

        elif check_name == 'file_size_budget':
            # Add lazy loading to images
            modified = re.sub(r'<img(?!\s[^>]*loading)', '<img loading="lazy"', modified)
            if modified != content:
                fixes_applied.append('file_size_budget: added loading="lazy" to images')

        elif check_name == 'print_css_exists':
            # Add minimal print CSS before </style> or before </head>
            print_css = '\n@media print { .no-print { display: none !important; } }\n'
            if '</style>' in modified:
                modified = modified.replace('</style>', print_css + '</style>', 1)
            elif '</head>' in modified:
                modified = modified.replace('</head>', f'<style>{print_css}</style>\n</head>', 1)
            if modified != content:
                fixes_applied.append('print_css_exists: added basic @media print rules')

        elif check_name == 'accessibility_basics':
            # Add alt="" to images without alt
            modified = re.sub(r'<img(?!\s[^>]*alt[=\s])', '<img alt=""', modified)
            if modified != content:
                fixes_applied.append('accessibility_basics: added alt="" to images')

        elif check_name == 'no_binary_garbage':
            # Remove control characters
            modified = re.sub(r'[\x00-\x08\x0e-\x1f]', '', modified)
            if modified != content:
                fixes_applied.append('no_binary_garbage: removed control characters')

    if fixes_applied and modified != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(modified)
        return modified, fixes_applied

    return content, fixes_applied


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_checks(filepath, expected_sections=None, expected_items=None):
    """Run all applicable checks on the given file."""
    results = []

    # Read file
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except FileNotFoundError:
        return [{"check": "file_exists", "status": "FAIL", "detail": f"File not found: {filepath}", "auto_fix_available": False}]

    # Determine file type
    ext = os.path.splitext(filepath)[1].lower()
    is_html = ext in ('.html', '.htm') or '<!DOCTYPE' in content[:100].upper() or '<html' in content[:200].lower()
    is_svg = ext == '.svg' or '<svg' in content[:500]

    # Universal checks (always run)
    results.append(check_encoding(filepath))
    results.append(check_no_binary(content))
    results.append(check_no_secrets(content))
    results.append(check_file_size(filepath))

    if is_html:
        # Parse HTML
        parser = SVLHTMLParser()
        try:
            parser.feed(content)
        except Exception as e:
            results.append({"check": "html_parse", "status": "FAIL", "detail": f"Parse error: {e}", "auto_fix_available": False})
            return results

        # Run HTML checks
        results.append(check_js_function_defined(parser))
        results.append(check_js_toggle_works(content, parser))
        results.append(check_css_no_conflict(parser))
        results.append(check_links_resolve(parser))
        results.append(check_no_empty_containers(content, parser))
        results.append(check_responsive_breakpoints(parser))
        results.append(check_no_placeholder_text(content))
        results.append(check_data_truncation(content, parser, expected_items or expected_sections))
        results.append(check_print_css(parser))
        results.append(check_accessibility(parser))

    elif is_svg:
        # Basic SVG checks
        if 'viewBox' not in content and 'viewbox' not in content:
            results.append({"check": "viewbox_set", "status": "FAIL", "detail": "SVG missing viewBox attribute", "auto_fix_available": True})
        else:
            results.append({"check": "viewbox_set", "status": "PASS", "detail": "viewBox set", "auto_fix_available": False})

    return results


def print_results(results, as_json=False):
    """Print results to terminal."""
    if as_json:
        print(json.dumps(results, indent=2))
        return

    # Summary header
    passes = sum(1 for r in results if r['status'] == 'PASS')
    fails = sum(1 for r in results if r['status'] == 'FAIL')
    warns = sum(1 for r in results if r['status'] == 'WARN')
    skips = sum(1 for r in results if r['status'] == 'SKIP')

    print(f"\n{'='*60}")
    print(f"  SVL VALIDATION RESULTS")
    print(f"{'='*60}")
    print(f"  PASS: {passes}  |  FAIL: {fails}  |  WARN: {warns}  |  SKIP: {skips}")
    print(f"{'='*60}\n")

    status_icons = {'PASS': '\033[92m✓\033[0m', 'FAIL': '\033[91m✗\033[0m',
                    'WARN': '\033[93m⚠\033[0m', 'SKIP': '\033[90m○\033[0m'}

    for r in results:
        icon = status_icons.get(r['status'], '?')
        fixable = ' [AUTO-FIX]' if r.get('auto_fix_available') else ''
        print(f"  {icon} {r['check']}: {r['detail']}{fixable}")

    print(f"\n{'='*60}")
    if fails > 0:
        print(f"  \033[91mVALIDATION FAILED\033[0m - {fails} check(s) need attention")
    else:
        print(f"  \033[92mVALIDATION PASSED\033[0m - artifact ready for delivery")
    print(f"{'='*60}\n")


def main():
    args = sys.argv[1:]

    if not args or args[0] in ('-h', '--help'):
        print(__doc__)
        print("Usage: python3 svl_check.py <file> [--fix] [--expected-sections N] [--expected-items N] [--json]")
        sys.exit(0)

    filepath = args[0]
    do_fix = '--fix' in args
    as_json = '--json' in args
    expected_sections = None
    expected_items = None

    for i, arg in enumerate(args):
        if arg == '--expected-sections' and i + 1 < len(args):
            expected_sections = int(args[i + 1])
        elif arg == '--expected-items' and i + 1 < len(args):
            expected_items = int(args[i + 1])

    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)

    # Run checks
    results = run_checks(filepath, expected_sections, expected_items)

    if do_fix:
        max_iterations = 3
        for iteration in range(max_iterations):
            fails = [r for r in results if r['status'] == 'FAIL' and r.get('auto_fix_available')]
            if not fails:
                break

            print(f"  Auto-fix iteration {iteration + 1}/{max_iterations}...")
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()

            content, fixes_applied = apply_fixes(filepath, content, results)
            if not fixes_applied:
                break

            for fix in fixes_applied:
                print(f"    Fixed: {fix}")

            # Re-run checks
            results = run_checks(filepath, expected_sections, expected_items)

    # Output results
    print_results(results, as_json)

    # Exit code: 1 if any FAIL
    has_fails = any(r['status'] == 'FAIL' for r in results)
    sys.exit(1 if has_fails else 0)


if __name__ == '__main__':
    main()
