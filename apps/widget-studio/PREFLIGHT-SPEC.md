# Pre-flight checklist — implementation spec

Agreed 2026-07-23 (design conversation). Guiding principle: **a false ⚠ is worse than a missed
one** — every rule states when it deliberately stays quiet. Pre-flight never blocks export.

## Architecture

- Pure `preflight()` on the logic instance → structured findings; NO UI coupling (host-agnostic —
  today it renders as a section in the Export modal, post-AngularJS-conversion it attaches to
  whatever "save to instance" becomes; see project_widget_studio_deployment_plan memory).
- Finding shape: `{ruleId, category, severity:'warn'|'note', message, why, nodeId?, classKey?,
  fix?:()=>void}`. `nodeId` → jump-to-fix selects the node and switches the inspector tab;
  `classKey` findings jump to the styled element carrying that class.
- Report UI groups by category and **shows ✓ passed rows too** (a bill of health, not a nag list).
- Runs on Export-modal open + a manual re-check button. Never continuously.
- The token-match detector is SHARED with the (separate, queued) live token-nudge feature — build
  it once as a standalone helper: `tokenMatch(prop, value) → token|null`.

## Rules

### 1. Semantics
- ⚠ `no-h1` — any `<h1>` in the widget (the portal page owns h1; widgets start at h2).
  Fix: demote to h2.
- ⚠ `heading-skip` — heading levels skip (h2→h4). Guard: only fires when the widget has ≥2
  headings.
- ⚠ `img-alt` — `<img>` with MISSING alt attribute. Present-but-empty `alt=""` (decorative) is
  valid and stays quiet. Fix: jump to Attributes tab.
- ⚠ `input-label` — input/select/textarea with none of: composable `data.label`, `aria-label`
  attr, preceding `<label>` sibling. Fix hint references the Form group component once it exists
  (see backlog).
- EXCLUDED from v1: "divs that look like a list" inference — belongs to the separate
  semantic-nudges feature; highest-false-positive family.

### 2. Accessibility
- ⚠ `contrast` — WCAG AA (4.5:1 text; 3:1 for ≥24px or ≥18.66px bold). ONLY when both fg and bg
  resolve to concrete solid colors (own class cascade, else nearest ancestor with explicit
  background, else the white stage). Gradients/images/unresolvable token chains: silently skipped.
- ⚠ `focus-suppressed` — a class sets `outline:none/0` with no replacement outline/box-shadow in
  its `:focus` bucket.
- ⚠ `focus-consistency` — (user-added) collect normalized `:focus` treatments across interactive
  elements' classes (a, button, input, select, textarea, button composable); fire when ≥2 distinct
  custom treatments exist, OR custom and browser-default are mixed. One widget, one focus language.
- ○ `hover-only` — class styles `:hover` but has no `:focus` state.
- ⚠ `icon-button-name` — icon-only button (no text) without `aria-label`.

### 3. Tokens
- ⚠ `token-match` — raw value exactly equals an existing token's value (space scale, shadows,
  sizes). One-click swap (shared detector, see Architecture).
- Raw values matching NO token: summary count only ("6 raw values, 0 token matches"), no per-item
  findings.

### 4. Class hygiene
- ⚠ `inline-style` — (user-added, upgraded) any `style` attribute in the exported markup. ONE
  exemption: the app's own INLINE_PROPS backgroundImage mechanism (content-driven, deliberate).
  Covers style attrs typed into the Attributes tab and raw-html blocks.
- ○ `class-convention` — class is neither on the Bootstrap 3 whitelist (panel*, btn*, form-*,
  col-*, table*, alert*, badge, label*, list-group*, nav*, breadcrumb, progress*, input-group*,
  well, jumbotron, glyphicon*, fa*, …maintained constant) nor BEM-shaped
  (`^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$`).
  Note-level ONLY — per user decision, detection not enforcement; the shaping mechanism is the
  class-input BEM hint (separate queued item).
- ○ `orphan-styles` — classStyles entries (incl. state/responsive buckets) whose class no exported
  node carries. Fix: remove unused styles.
- ○ `empty-container` — container with no children, no text, AND no styling at all (a styled
  spacer/height/background div stays quiet).

### 5. Data & options
- ⚠ `unresolved-binding` — `{{c.data.x}}`/`ng-repeat` source the server script never assigns, or
  `options.x` absent from schema + surfaced instance fields. MUST reuse the existing preview-scope
  resolution so it agrees exactly with the canvas placeholders.
- ⚠ `unused-option` — custom schema option nothing references (per user: options should be used).
- Instance fields: NO rule — inherited fields legitimately sit unused (user decision).

### 6. Responsive
- ⚠ `fixed-width-overflow` — fixed px width/minWidth wider than a breakpoint tier it applies to
  (base 900px with no xs override → phone overflow). Static analysis only in v1; live at-xs
  overflow measurement is a possible later upgrade, deliberately excluded (too fragile for a
  never-wrong report).

## Quick fix riding along with implementation
- Binding buttons' glyph: `{ }` → `{{}}` (user request, trivial).

## Backlog recorded elsewhere (not this feature)
- **Bootstrap Form group component** (top of Bootstrap-section expansion; input-label rule's fix
  funnel).
- **Modals** — needs its own design conversation first: canvas markup vs spModal/$uibModal client
  scaffolding.
