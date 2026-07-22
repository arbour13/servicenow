# Theme Generator UI

Standalone ServiceNow portal theme generator. The active file is **`theme-generator-ui.html`** — no build step, vanilla JS/CSS. Open it directly in a browser.

## Key facts

- All state is in a single `state` object in the `<script>` tag
- Color picker: Pickr (nano theme) via CDN, singleton instance `_pickr`
- Box shadows: `state.shadows[lv]` is an **array** of layer objects `{ dx, dy, height, spread, color, opacity, inset? }` (compound shadows supported). `spread` and `inset` are both emitted by `shadowLayerCSS`.
- Shadow CSS uses `OFFSET_SCALE = DIR_STEPS / DIR_R` to convert dial units → CSS px
- Units system: internal values always in px; `formatPx()` converts to display unit; `unitToPx()` converts back
- Root font size default: 10px (ServiceNow convention: 0.1rem = 1px)
- Border radius tokens: sm=2, md=4, lg=8, xl=12, round=50 (px); stored in `state.radius`
- **App-chrome spacing must use the `--sp-*` tokens** (defined in `:root` at the top of the app `<style>`): `--sp-xxs:2 --sp-xs:4 --sp-sm:8 --sp-md:12 --sp-lg:16 --sp-xl:24 --sp-xxl:32 --sp-3xl:40`. These mirror the generated `$sp-space--*` scale (`state.spacing`). Use them for every `margin`/`padding`/`gap`; never introduce off-scale px spacing. Exempt: structural constants (e.g. the 50px swatch-column indent), 1px hairlines, and non-spacing props (border-radius, font-size, line-height, transform/position nudges).

## File structure (inside theme-generator-ui.html)

- `<style>` — all CSS, BEM naming
- `<body>` — split-pane layout: `.panel` (left) + `.preview-pane` (right)
- `<script>` — all JS, organized into three zones (see below)
- Bottom of body: Pickr CDN, `#pickrMount` div

## Script zones (keep this boundary)

The `<script>` is split into three labeled zones so the pure logic can eventually
be lifted into a ServiceNow UI Script untouched. Respect the boundary when adding code:

1. **ZONE 1 — THEME ENGINE** (top, banner-marked). Pure, **DOM-free**: `state` shape,
   data tables, color math, shadow/offset math, unit conversion, brand-variant
   generation (`autoVariant` + `VARIANT_*`), token resolution (`getPrimitiveVarList`,
   `resolveTokenRef`, `tokenCssValue`, `TOKEN_DEFS`), and label→key helpers.
   **Never reference `document` here.** If a new helper is pure, it goes here.
2. **BOOT** — parse-time side-effects that seed state (e.g. `state.brandVariants = {…}`).
   Runs after the engine defines its deps, before the UI renders.
3. **ZONE 3 — UI** — everything that touches the DOM: render functions, popups,
   components, event handlers, copy-to-clipboard.

Functions are hoisted, so a UI function may call an engine function declared above it
freely; just don't put DOM code in Zone 1.

## Reusable helpers (use these when adding controls/popups)

The spacing / radius / shadow / color popups share these — reuse them instead of
re-rolling boilerplate when adding a new control:

- `sizePopupToPanel(popupId)` → sizes the popup to the left panel, returns the element.
  Call it where you build the popup; then `popup.classList.add('shadow-popup--open')`.
- `closePopupShell(popupId)` → drops the `--open` class (the close half).
- `gateAddBtn(nameId, varId, btnId)` → disables a popup's Add/Save button until both
  the name and variable-name fields are non-empty. Wrap with the popup's own "is new"
  guard.
- `slugifyName(s)` (ENGINE) → the single slug rule for variable names
  (`lowercase`, spaces→`-`, strip non `[a-z0-9-]`). No trim/fallback — `*LabelToKey`
  add `.trim()` + `|| 'custom'`; popup auto-fill uses it raw.

Snapshot/revert is intentionally NOT unified — each popup's value shape differs
(primitive / object / cloned layer array), so each keeps its own `_xSnapshot`.

## Shadow layer editor

The shadow editor is **inline** (expands under the row, `shi*`-prefixed IDs:
`buildShadowEditPanel` / `shiLayerHTML` / `toggleShadowExpand`). The old
popup-based editor (`openShadowPopup`, `renderShadowLayers`, `shadowLayerHTML`,
`_popupLv`, `.shadow-popup*`/`.shadow-layer__*` CSS) was fully removed — do not
reintroduce it. Mirror the **colors** section for any new shadow behavior:

- Inset toggle uses `.ce-switch.ce-switch--sm` (same as "Generate range colors"). The knob **must** include the checkmark SVG — `<span class="ce-switch__knob"><svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` — so the check appears when on.
- Custom-shadow row delete is two-step (`armOrDeleteShadow` / `_disarmShadowDelete`), like colors; uses `.color-row__delete-btn`.
- Custom-shadow variable names are validated (`validateShadowVar`, `shiVarErr_*` + `is-invalid`), mirroring `validateColorVar`.
- Direction dial (`.dir-picker`) is keyboard-operable: `role="slider"`, `tabindex=0`, arrows nudge the light 1px (`onShiDialKey` → `_commitShiDial`), Home recenters.
- Custom shadows reorder via drag + Alt+Arrow (`onShadowDrag*` / `moveCustomShadow`), like custom colors; built-ins are fixed.
- Never use blue on `:hover` (focus-only) — applies to the row preview and layer icon too.

## Button style guide

All interactive element hover colors are controlled by six CSS variables in `:root`. **Never introduce a hardcoded neutral hover hex — always use these variables.** After any button CSS change, audit every hover rule against this guide.

```
--btn-color:          #8c959f    default resting color for icon/text buttons
--btn-color-active:   #24292f    hover text color for all buttons (single value — no tier split)
--btn-hover:          rgba(100,116,139,0.12)  universal neutral hover bg — cool blue-gray, matches panel hue
--btn-hover-destroy:  rgba(207,34,46,0.10) destructive hover bg (red overlay)
--btn-color-destroy:  #cf222e    destructive hover text color
```

**Rules:**
- `--btn-hover` is the only neutral hover background. It works on the section header (#EEF0F3), the gray panel (#F6F7F9), and white sub-panels — all darken proportionally.
- Blue (`#0969da`) is **only** for focus rings, `active`/`on` toggle states, and input `focus` borders. **Never** use blue for `:hover` backgrounds or borders.
- The one non-overlay exception is `.color-row__delete-btn` (destructive red) — uses `--btn-hover-destroy` / `--btn-color-destroy`.
- `.main-section__header:hover` keeps a literal `#E4E7EC` — it is a section background state, not a button.

**Height tokens** (defined in `:root`, use these — never hardcode px in button rules):
```
--btn-h-sm:    22px   icon-only buttons
--btn-h-md:    26px   text+icon header buttons
--btn-h-input: 28px   buttons that pair with input fields
```

**Button height standards:**
- Section header text+icon: `height: var(--btn-h-md)` — `.main-section__copyall`, `.main-section__range-btn`
- Section header icon-only: `var(--btn-h-sm)` square — `.main-section__help-btn`
- Content area icon-only: `var(--btn-h-sm)` square — `.copy-btn`, `.color-edit__reset`, `.color-row__delete-btn`, `.color-row__scale-toggle`
- Input-matched: `var(--btn-h-input)` — `.color-edit__eye`, `.font-loader__btn`, `.font-loader__input`
- Exempt (compact badges, not standard buttons): `.color-row__help-btn` (16px), `.item-preview__delete` (16px)

## Reference

`gf-variables-and-mixins.scss` — GlideFast's actual ServiceNow SCSS variables; source of truth for which CSS variables the tool generates.
