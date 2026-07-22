# theme-foundation — shared design tokens

`_tokens.scss` is the single source of truth for the suite's SCSS token vocabulary
(`$background-*`, `$text-*`, `$brand-*`, `$border-*`, radius, spacing, type). Every token is
`!default`, which makes a widget both **consistent** across the suite and **portable** across
ServiceNow portals/instances:

- The tokens are inlined at the **top** of each widget's own `<css>` field, before the widget's
  scoped rules.
- `!default` = "use this unless the variable is already defined." A portal theme's CSS Variables
  compile *ahead* of a widget's SCSS, so if the target portal defines a token, that wins; otherwise
  the widget falls back to these bundled defaults and still looks right.

This is the **compile-time (`$`) layer** — portal/brand integration. An app's own **runtime**
light/dark flipping is separate (CSS custom properties + `data-theme`), seeded from these values but
living in the app's own `scss/app.scss`. See `apps/core/scss/app.scss` for the reference pattern.

## Adopting it in an app

1. **Reference the tokens** in `scss/app.scss` — do NOT redefine them. Seed your runtime custom
   properties from them, e.g.:
   ```scss
   :root { --bg: #{$background-primary}; --accent: #{$brand-primary}; }
   :root[data-theme='dark'] { --bg: #10131a; --accent: #5b9fe0; }  // your own dark values
   body { background: var(--bg); font-family: $font-family-base; }
   ```
2. **Dev build** — prepend the partial when compiling standalone (no `@import` needed):
   ```json
   "build:css": "cat ../../tools/theme-foundation/_tokens.scss scss/app.scss | npx sass --stdin css/app.css --no-source-map"
   ```
3. **Deploy build** — hand the partial to the packager via `sources.sharedScss` (see
   `apps/core/scripts/build-deploy.js`):
   ```js
   sharedScss: [path.join(ROOT, '..', '..', 'tools', 'theme-foundation', '_tokens.scss')]
     .map(function (f) { return fs.readFileSync(f, 'utf8'); }).join('\n'),
   ```
   The packager prepends it into the widget's `<css>` before scoping (`tools/packager` buildParts).

That's it — the app now shares the suite vocabulary and inherits a host portal's theme where present.

## Adding or changing a token

Edit `_tokens.scss`. Keep names category-first (`$border-radius-*`, not `$radius-*`), keep the
`!default`, and prefer adding over renaming (a rename is a breaking change for every consuming app).
