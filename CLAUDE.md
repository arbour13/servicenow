# ServiceNow app suite — conventions

Everything under `ServiceNow/` is work that targets the ServiceNow platform. It's organized by
*purpose*, and these conventions apply to the **deployed apps** here.

## Working across apps — one folder, one branch (`main`)

This whole repo lives in the single folder `~/Documents/Projects/servicenow`, always on the
**`main`** branch. That's it — there is no branch-per-app scheme, and no git worktrees. The user
often has several app-chats open at once (one per app), and that is fine: every chat works in this
same folder on `main`, each editing its own app's files under `apps/<app>/`. Concurrent chats do
**not** collide, because nobody switches branches — different apps are just different files.

**Rules for every chat:**
- **Stay on `main`. Do not create branches, switch branches, or make git worktrees.** Branch-per-app
  is exactly what this repo deliberately abandoned; re-introducing it causes the concurrent-chat
  collisions this layout exists to avoid. If a task ever seems to genuinely need a branch, stop and
  ask the user first — don't create one unprompted.
- **Commit on `main`** as work reaches sensible checkpoints (the user may just say "save a
  checkpoint" — that means commit).
- **GitHub is only an off-site backup.** The `origin` remote exists so the user can `git push` a copy
  of `main` to GitHub whenever they want. No pull requests, no feature branches — a push is just a
  backup. Push when the user asks (e.g. "back up to GitHub"); don't push unprompted.
- The user does **not** need to know git commands — they ask in plain English ("what changed?",
  "save a checkpoint", "back up to GitHub") and you run the right command for them.

Per-app context, when an app needs its own notes beyond this file, lives in `apps/<app>/CLAUDE.md`
(read automatically when working in that app's folder). This root file is shared context every chat
reads.

## What lives where

Two top-level groups under `ServiceNow/`:

- `apps/` — **all the applications you build** (each flat: `index.html` + `js/` + `scss/` +
  `scripts/` + `css/` + `package.json` at the app root, served relative so one `ServiceNow/`-root
  server serves them all):
  - **Deployed AngularJS SN apps** — the conventions below apply to these: `apps/glide-studio/`,
    `apps/docs/`, `apps/delivery-methodology/`.
  - **CONVENTION-EXEMPT apps** — generators / not-yet-AngularJS, until converted:
    `apps/theme-generator/`, `apps/widget-studio/`, `apps/scss-mixin-generator/`.

  `apps/delivery-methodology/` deploys as **five** Service Portal widgets rather than one (see
  `manifest.widgets[]` in the packager's `manifest.schema.md`, and that app's own `CLAUDE.md`).
  `apps/glide-studio/` and `apps/docs/` currently set `deployable: false` in their
  `deploy.manifest.js`, so the packager does not offer them.
- `tools/` — **build tooling**, never deployed:
- `tools/sn-deployment-packager/` — builds Fluent / Now SDK projects and deploys via a local
  sdk-bridge (runs in Node/browser at build time; never ships into ServiceNow).

**All paths are relative** — an app's own files (`js/app.module.js`, not `/js/...`) AND cross-tree
references (the SN Deployment Packager) use relative paths too: from an app at `apps/<app>/`, reach
the SN Deployment Packager at `../../tools/sn-deployment-packager/…`. Relative (not absolute
`/tools/sn-deployment-packager/…`) so an app works regardless of where the dev server is rooted —
absolute paths silently 404 unless the server root is exactly `ServiceNow/`, which breaks the app's
own deploy tooling. Navigate to **trailing-slash** URLs (`/apps/glide-studio/`, not `…/index.html`)
so relative paths resolve.

## Shared code

**Build-time libraries** (`tools/sn-deployment-packager`) run on your machine to *produce* an app's
deployed artifacts. They never ship into ServiceNow. Framework-agnostic (plain Node JS) is fine and
preferred here.

**There is currently no shared *runtime* mechanism.** Each deployed app is fully self-contained —
even a provider genuinely needed by more than one app (e.g. a `ThemeService` light/dark toggle) is
vendored into every app that uses it, namespaced to that app's own localStorage key, rather than
injected by name from a common module. (A prior "Core" app hosted shared AngularJS providers that
consumer apps injected by name from one Service Portal page injector; it was removed 2026-07-26
after recon showed only one small service was genuinely shared across apps, while the mechanism's
cost — every consumer silently depending on Core being installed first, with nothing enforcing that
order — outweighed the few lines it saved. See git history around that date if a real multi-app
runtime-sharing need reappears, rather than reinventing it from scratch.)

Extraction judgment (build-time or, if reintroduced, runtime): one concern per shared module;
extract only *real* duplication (2+ apps carrying substantively the same logic, or explicitly-known
future need) — a superficially similar 5-20 line helper implemented differently per app is not worth
a shared abstraction.

**Deliberately paired content — keep in sync, don't merge:**
`apps/glide-studio/standards/glidefast-scripting-standards.md` and
`apps/standards/standards/glidefast-scripting-standards.md` are intentionally two variants of the
same document, NOT accidental duplication. The glide-studio copy carries Glide-Studio-specific
callouts ("Build this in …" builder tie-ins, "Glide Studio addition" section labels); the standards
copy is the de-branded standalone rendering ("Extended guidance", no builder references). The
*substance* (rules, code samples, section structure) must stay identical. When editing the
standards content in either app, apply the same substantive change to the other copy (preserving
each one's own branding phrasing), then re-run that app's `scripts/build-standards.js`.

## ServiceNow deployment: use the shared SN Deployment Packager

If an app's deliverable is a ServiceNow scoped app (portal, page, or widget), **do not hand-roll the
Fluent/SDK packaging.** Use `tools/sn-deployment-packager/`:

- `tools/sn-deployment-packager/core.js` — pure, I/O-free core: provider-body extraction, SCSS
  scoping, every `sp_*` record builder, sys_id derivation, `buildRecordModel`.
- `tools/sn-deployment-packager/fluent.js` — emits a Now SDK / Fluent TypeScript project from that model.
- `tools/sn-deployment-packager/sdk-bridge.js` — localhost bridge: Connect credentials → `now-sdk`
  auth/install with NDJSON progress (used by the deploy console).
- `tools/sn-deployment-packager/manifest.schema.md` — the manifest/sources contract. Read it before
  wiring a new app. If the core lacks something (a new record type, extraction case), extend the
  core — don't duplicate its logic locally.

**One record model, Fluent emitter.** `buildRecordModel(manifest, parts)` is the ONE place that
knows which records + fields make up a package; `fluent.js`'s `assembleFluent` walks it into typed
`SPWidget`/`SPAngularProvider` plus generic `Record()` for everything else. A new field on an
existing record type is a one-place change. The deploy console is SDK-only: Connect, preview Fluent
sources, suggest a semver bump from Fluent-vs-prior diffs, and **Deploy with Now SDK** (progress
modal). Live-instance prefix detection is `instance.js`. The Node CLI writes
`apps/<app>/deploy/fluent/`:

`node tools/sn-deployment-packager/build.js <app-folder> [--fluent-mode=project|files]`

### How to consume it

One server serves the whole `ServiceNow/` tree, so cross-tree files are referenced **by relative
path** — no vendoring:

- **Node CLI** — `node tools/sn-deployment-packager/build.js <app-folder>` (see packager README).
- **The standalone deploy console** (`tools/sn-deployment-packager/index.html`) — build/preview and
  Deploy with Now SDK for ANY deployable app outside of that app's own harness. It discovers apps by
  probing each `apps/<app>/deploy.manifest.js`; an app with no such file (or `deployable: false`)
  does not show up — see "The deploy.manifest.js descriptor" below.
- **SDK bridge** — `node tools/sn-deployment-packager/sdk-bridge.js` (keep running while deploying).

### The `deploy.manifest.js` descriptor

Every deployable app has ONE `deploy.manifest.js` at its own root - the single source of truth for
its deployment manifest (provider list, sys_id prefix, roles, file paths), read by the standalone
deploy console and the Node CLI, so the manifest is never hand-copied into a second place. Adding a
new deployable app means adding its `deploy.manifest.js` (see
`tools/sn-deployment-packager/manifest.schema.md`'s "deploy.manifest.js" section for the exact shape)
and its folder name to the console's `KNOWN_APP_FOLDERS` list
(`tools/sn-deployment-packager/console.js`). An app with none is intentionally not deployable -
that's the "convention-exempt" tools' current state, not an error.

## Sys_id rule

Pick a distinctive `sysIdPrefix` per app (so derived sys_ids never collide with another app's). If
an app already shipped with hand-picked literal sys_ids before adopting the SN Deployment Packager
(or may already be imported into a live instance), pin them via `manifest.sysIds` so re-importing
updates the same records instead of duplicating them — see `core.js`'s `deriveSysIds()` doc comment.

## Scripting style

Clean Code–oriented conventions for this whole suite (apps and tools):

- **No JSDoc** — short `//` intent comments only when a well-named function is not enough; never
  `@param` / `@returns` blocks.
- **CRUD verbs on record I/O** — `get…` to read, `create…` to insert, `update…` to update,
  `delete…` to delete. Do not use `query` / `insert` / `read` / `write` in *our* function names
  (platform APIs like `GlideRecord.insert()` stay as they are).
- **One GlideRecord (or GlideRecordSecure) per function** — orchestration that needs several
  cursors calls several functions.
- **Declare and assign on the same line** — `var name = value;`, not `var name;` then assign later
  when avoidable.
- **No abbreviations** — prefer `contentRecord`, `systemId`, `index` over `gr`, `sysId`, `i`
  (platform terms like `sys_id` as *field* names are fine).
- **Names over comments** — if you need a section comment, extract a function instead.
- **Blank lines between differently shaped statements** — group same-shape lines (e.g. a run of
  `setValue`); blank line when the shape changes.
- **No empty line at end of code files** — end on the last line of code plus a single trailing
  newline (POSIX). Do not leave a blank line after that. Exception: leave `.css` / `.scss` alone
  (including any trailing blank lines they already have).
- **Blocks over ternaries** — prefer `if` / `else` blocks; do not use `? :` for control flow or
  value selection when a block statement is clearer.
- **Always brace blocks** — every `if` / `else` / `for` / `while` body gets `{ }`, even one-liners.
- **Object properties on multiple lines** — when defining or assigning an object literal, put each
  property on its own line (including single-property objects used as payloads).

## Styling

A widget's own `<css>` field is the *sole* styling carrier — there is no separate `sp_css` Include
or Theme-variable dependency. Each app authors its own `$token: value !default;` declarations
directly, plus its own scoped rules, so it adopts whatever portal theme it's dropped into if that
theme already defines the token, and falls back to its own bundled default otherwise. (An app can
also opt into a *shared* token partial via `manifest.sharedScssPartials` — see
`tools/sn-deployment-packager/manifest.schema.md` — though no app currently uses this.) Never depend
on a class or variable that only exists in one specific portal's theme (e.g. HomeSpace) — that
breaks portability to any other instance/portal. The runtime light/dark toggle is a separate
concern: each app vendors its own `ThemeService` provider (`data-theme` on `<html>`), namespaced to
that app's own localStorage key.
