# Widget Studio — app notes

Suite rules in the repo-root `CLAUDE.md` apply. Additions for this app.

## What it is

A single-file Service Portal widget builder: `widget-studio.html` (~7k lines, React via
`support.js`'s `evalDcLogic`, no build step). Convention-exempt from the suite's AngularJS rules —
it has not been converted yet.

**Primary goal: make it faster and easier for a developer to build a CORRECT Service Portal widget.**
Teaching is explicitly secondary here — that's Glide Studio's job. Judge features against that.

## Deployment is gated

Do **not** build packager / `deploy.manifest.js` / Update-Set-XML support for the current React
version. The standing decision is: convert to AngularJS first, *then* wire the packager. The Export
modal (6 copy-paste fields) is a deliberately thin interim path — don't over-invest in it.

## Style tab — settled conventions

These have each been decided, in some cases reverted and re-decided. Don't relitigate without asking.

- **Section ORDER is fixed and never varies by selection**: Layout → Spacing → Size → Typography →
  Background → Border → Effects → Transforms & Transitions → Position. "Order is the map, and a map
  that changes can't be learned." Reorder-on-select (`57f6dbc`) and scroll-to-lead (`1d08101`) were
  both tried and reverted. The reason is structural: the panel's write target is the CLASS, not the
  element, and any class can land on any element — so a `.divider` shared between an `hr` and a `p`
  must present identically whichever one you clicked.
- **All sections start EXPANDED**, for every element type. The per-type default-open (`styleLead` +
  `DEFAULT_OPEN_BY_LEAD`) was deleted; what the panel shows no longer varies with the selection at
  all. Only what the user collapses, which `_inspOpen` remembers.
- **One band primitive.** `inspBand(t,title,body,opts)` is the ONLY place the band box exists
  (1px border / radius 8 / padding 8). `edgeBand`, `spaceBand` and `insetBand` all render through
  it. It also owns the vertical rhythm (`marginTop:8`, suppressed via `opts.first`) — **callers must
  not wrap bands in spacer divs**. Every section is banded; that uniformity is the point.
- **Section headers are sticky** so you can always tell which section a field belongs to. Their
  background is `t.panel2` — `renderInspector` rebinds `t` (`segBg` becomes `panel`), so `panel2` is
  the surface these actually sit on.
- **Colour rule**: solid `accentFill` = a persistent MODE that retargets later edits — only the
  device/width switchers qualify. Light `accentSoft` = a value, or what you're currently looking at.
  The IN PARENT block is the one exception, using a solid indicator purely for contrast on its own
  tinted surface.
- **Spacing's Margin and Padding are SIBLING bands**, not nested, and there is no "Content"
  placeholder. Both were box-model-diagram leftovers; the nesting cost width and drew a model that
  was wrong anyway (margin wrapping padding skips the border, which lives in its own section).

## Grid columns vs rows

Columns have **Preset / Fixed / Auto**; Preset is an icon row of N equal tracks and is the only
mode without the raw `1fr` track list. Preset-vs-Fixed is derived from the value with a per-node
override (`_gridColModeOv`) so choosing Fixed on an even grid sticks — the same derived-plus-override
pattern the spacing/border grain switches use.

Rows deliberately get **none of that**. A grid's width is essentially always definite so `1fr`
columns divide real space; its height usually isn't, so an "N equal rows" preset would frequently
render identically to setting nothing, and `repeat(auto-fill, …)` on rows needs a definite height to
make more than one track. The row template that matters is uneven anyway (`auto 1fr auto`), which the
existing track list already covers. What rows got instead is **Auto rows** (`grid-auto-rows`) — the
height of the implicit rows items actually flow into.

Column-count writes must go through **`setGridColumns`**, never the raw setter: shrinking the count
has to clamp children pinned past the new last column and re-normalize source order.

## The cascade model (important)

Style edits always write to the **primary class** (`node.classes[0]`). But `effectiveStyle` merges
all of an element's classes, and the emitted stylesheet's later rule wins. So on a multi-class
element another class can override what you just wrote — the write lands, the canvas doesn't move,
and the control correctly snaps back to the winning value.

That is **not** a bug in the cascade; `effectiveStyle`, the canvas and the export all agree.
`styleConflicts()` / `conflictBanner()` surface it instead. If you're diagnosing "the panel ignores
my click," check for a competing class before suspecting the control.

Two readers exist and are not interchangeable: **`csVal` reads only the primary class** (what most
controls use for their own selected state); **`effectiveStyle` reads the merge** (what the canvas
paints and what Display reads).

## Testing this app

There is no test suite. Verify live:

1. `node --check` on the extracted `<script>` bodies catches syntax errors.
2. Serve the repo root (`servicenow-suite`, port 4105) and open
   `/apps/widget-studio/widget-studio.html`.
3. Get a handle on the live component by walking React fibers up to the `StreamableComponent` and
   taking `.logic` — that exposes every method for direct exercise.

**`forceUpdate()` does not flush synchronously.** Reading the DOM or `getComputedStyle` in the same
tick as a mutation returns the PREVIOUS render. Split the mutation and the assertion into separate
calls. Several "bugs" in this app's history were this staleness, not real defects.

Editing the file may open it as a `file://` page in the browser pane; console errors with
`file:///…/support.js` in the stack are from that transient page, not the served app.
