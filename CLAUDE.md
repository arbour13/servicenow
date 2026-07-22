# ServiceNow app suite — conventions

Everything under `ServiceNow/` is work that targets the ServiceNow platform. It's organized by
*purpose*, and these conventions apply to the **deployed apps** here.

## What lives where

Two top-level groups under `ServiceNow/`:

- `apps/` — **all the applications you build** (each flat: `index.html` + `js/` + `scss/` +
  `scripts/` + `css/` + `package.json` at the app root, served relative so one `ServiceNow/`-root
  server serves them all):
  - **Deployed AngularJS SN apps** — the conventions below apply to these: `apps/core/` (the
    **GlideFast Core** app, Angular module `glidefastCore`: shared providers other apps inject +
    a generic doc/wiki widget), `apps/glide-studio/`, `apps/standards/`.
  - **CONVENTION-EXEMPT apps** — generators / not-yet-AngularJS, until converted:
    `apps/theme-generator/`, `apps/widget-studio/`, `apps/scss-mixin-generator/`,
    `apps/delivery-methodology/`.
- `tools/` — **build tooling**, never deployed:
  - `tools/packager/` — assembles ServiceNow Update Set XML (runs in Node/browser at build time).
  - `tools/theme-foundation/` — the gf- SCSS `!default` token source, inlined into each widget at build (planned).

**All paths are relative** — an app's own files (`js/app.module.js`, not `/js/...`) AND cross-tree
references (Core, the packager) use relative paths too: from an app at `apps/<app>/`, reach Core at
`../core/js/…` and the packager at `../../tools/packager/…`. Relative (not absolute `/apps/core/…`)
so an app works regardless of where the dev server is rooted — absolute paths silently 404 unless the
server root is exactly `ServiceNow/`, which breaks the app (Angular can't load the `core` module → the
app fails to bootstrap and shows raw `{{ }}`). Navigate to **trailing-slash** URLs
(`/apps/glide-studio/`, not `…/index.html`) so relative paths resolve.

## Shared code is two different problems — don't conflate them

1. **Build-time libraries** (`tools/packager`, `tools/theme-foundation`) run on your machine to
   *produce* an app's deployed artifacts. They never ship into ServiceNow. Framework-agnostic (plain
   Node JS) is fine and preferred here.
2. **Runtime shared code** — all deployed apps are AngularJS sharing ONE Service Portal Angular
   injector per page. So shared runtime services/directives live as AngularJS providers in the
   **Core app** (`glidefastCore` module), deployed ONCE, and consumer apps inject them **by name**.
   Do NOT vendor or duplicate runtime code into each app. (A consumer app's dev harness lists
   `glidefastCore` as a module dependency and loads Core's provider files locally; in the deployed
   Service Portal, providers register into the shared injector, so by-name injection just works as
   long as Core is installed.)

Extraction judgment (both kinds): one concern per shared module; extract only *real* duplication
(2+ apps carrying substantively the same logic, or explicitly-known future need) — a superficially
similar 5-20 line helper implemented differently per app is not worth a shared abstraction.

## ServiceNow deployment: use the shared packager

If an app's deliverable is a ServiceNow Update Set (scoped app, portal, page, or widget), **do not
hand-roll the XML-assembly/extraction logic.** Use `tools/packager/`:

- `tools/packager/snpackager.core.js` — pure, I/O-free core: provider-body extraction, SCSS scoping,
  every `sp_*` record builder, sys_id derivation, `assembleXml`.
- `tools/packager/manifest.schema.md` — the manifest/sources contract this core takes. Read it before
  wiring a new app. If the core lacks something (a new record type, extraction case), extend the
  core — don't duplicate its logic locally.

### How to consume it

One server serves the whole `ServiceNow/` tree, so cross-tree files are referenced **by relative
path** — no vendoring:

- **Browser app with its own live Deploy modal** (see `apps/glide-studio/js/services/deploy.service.js`):
  load `<script src="../../tools/packager/snpackager.core.js">` before your own deploy service; it
  exposes `window.SNPackager.core`. (Only true external npm deps that aren't in the served tree — e.g.
  js-beautify — still get vendored into the app's own `lib/`.)
- **Node build script** (see `apps/standards/scripts/build-deploy.js`): just
  `require('../../../tools/packager/snpackager.core.js')` by relative path.
- **The standalone deploy console** (`tools/packager/deploy-console.html`) - build/preview/download
  a package for ANY app outside of that app's own dev harness. It discovers deployable apps by
  probing each `apps/<app>/deploy.manifest.js`; an app with no such file just doesn't show up in
  its dropdown - see "The deploy.manifest.js descriptor" below.

Same idea for **runtime shared providers**: a consumer app's dev harness loads Core's provider files
by relative path (`<script src="../core/js/services/theme.service.js">`), so nothing is copied per app.

### The `deploy.manifest.js` descriptor

Every deployable app has ONE `deploy.manifest.js` at its own root - the single source of truth for
its packager manifest (provider list, sys_id prefix, roles, file paths), read by that app's own
build host (a `build-deploy.js` Node script, or a live Deploy modal's service) AND the standalone
deploy console, so the manifest is never hand-copied into a second place. Adding a new deployable
app means adding its `deploy.manifest.js` (see `tools/packager/manifest.schema.md`'s
"deploy.manifest.js" section for the exact shape) and its folder name to the console's
`KNOWN_APP_FOLDERS` list (`tools/packager/deploy-console.js`). An app with none is intentionally
not deployable - that's the "convention-exempt" tools' current state, not an error.

## Sys_id rule

Pick a distinctive `sysIdPrefix` per app (so derived sys_ids never collide with another app's). If
an app already shipped with hand-picked literal sys_ids before adopting the packager (or may already
be imported into a live instance), pin them via `manifest.sysIds` so re-importing updates the same
records instead of duplicating them — see `snpackager.core.js`'s `deriveSysIds()` doc comment.

## Styling

A widget's own `<css>` field is the *sole* styling carrier — there is no separate `sp_css` Include
or Theme-variable dependency. It bundles `$token: value !default;` declarations (from
`tools/theme-foundation`, inlined by the packager) plus its own scoped rules, so it adopts whatever portal
theme it's dropped into if that theme already defines the token, and falls back to its own bundled
default otherwise. Never depend on a class or variable that only exists in one specific portal's
theme (e.g. HomeSpace) — that breaks portability to any other instance/portal. The runtime light/dark
toggle is a separate concern: a shared `ThemeService` provider in Core (`data-theme` on `<html>`).
