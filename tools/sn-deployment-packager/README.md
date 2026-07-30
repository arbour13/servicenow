# ServiceNow Deployment Packager

Build a Fluent / Now SDK project for any suite app that has a `deploy.manifest.js`, and deploy it
with the Now SDK via a local bridge.

This folder is **build tooling** - it never ships into ServiceNow. The browser console and the Node
CLI share the same core (`core.js` / `fluent.js` / `semver.js`).

## Open the console

1. Serve the **suite root** (the folder that contains `apps/` and `tools/`), not this file alone. Relative paths to `apps/<app>/…` only resolve from there.
2. Open `/tools/sn-deployment-packager/` (trailing slash).
3. Pick an app from the dropdown. Only folders listed in `console.js`’s `KNOWN_APP_FOLDERS` that also have a `deploy.manifest.js` with `deployable` not set to `false` appear.

Example (from the suite root):

```bash
npx --yes serve -l 4173 .
# then open http://localhost:4173/tools/sn-deployment-packager/
```

## Deploy with Now SDK (SDK bridge)

The browser console cannot run `now-sdk` itself. A tiny **localhost bridge** registers the Connect
panel’s credentials with the Now SDK and streams install progress:

```bash
# From the suite root (keep this terminal open while using the console)
node "$(git rev-parse --show-toplevel)/tools/sn-deployment-packager/sdk-bridge.js"
```

Then in the console (for an app with Connect enabled, e.g. Delivery Methodology):

1. **Connect** to the target instance.
2. Review **App name / App ID / Version** (Version is suggested from Fluent-vs-prior change size — edit freely).
3. **Deploy with Now SDK** — opens a progress modal, syncs Connect credentials into the SDK Keychain, rebuilds `apps/<app>/deploy/fluent/`, then runs `now-sdk build` + `now-sdk install`.

The bridge listens only on `127.0.0.1:17345`. Passwords are not logged or written to disk. If the
bridge is offline, Deploy stays disabled (hover the button for how to start it). Run it from a
normal Terminal window (not an agent/sandbox shell): Cursor injects a short-lived `HTTPS_PROXY`
that makes `now-sdk auth` fail with a bare `fetch failed`. The bridge now strips those proxy vars,
but a bridge already started under the old code must be restarted.

### Progress stream

`POST /auth` and `POST /deploy` return **NDJSON** (`application/x-ndjson`): one JSON object per line
with `step`, `message`, `pct`, and `ok`. The console modal updates the bar and log from those events.

`GET /fluent-sources?appFolder=…` returns comparable Fluent source files from disk so the console
can suggest a semver bump before the first rebuild of a session.

## Version suggestions

After each Fluent rebuild, the console diffs the new emit against the previous Fluent sources
(in-memory, or on-disk via the bridge) and suggests **major / minor / patch** on top of:

- the **installed** app version (when Connect found one), else
- the manifest version

Rough guide: small tweaks → patch; feature-sized controller/template work → minor; large rewrites →
major. The Version field stays editable; a hand edit is kept until you change apps or Connect again.

## Connection panel (some apps only)

Apps with `deployOptions.showConnection: true` (e.g. Delivery Methodology) show Instance URL /
credentials:

- **Connect** detects the vendor prefix and whether this app is already installed (by deterministic `sys_id`).
- **Deploy** uses those credentials through the SDK bridge.

Apps without that flag use a **fixed App ID** from their manifest. You still need the bridge +
credentials to install via the SDK.

### Connect / CORS

Connect runs from your browser to the instance origin. It needs:

- A reachable instance URL and valid Basic-Auth credentials with Table API access
- **CORS** allowed from this console’s origin to that instance

Saved connection passwords are stored in this browser’s `localStorage` (convenient for a personal
tool; don’t treat that as a secrets vault).

## Node CLI (no browser)

```bash
node tools/sn-deployment-packager/build.js <app-folder> [--fluent-mode=project|files]
  [--scope=...] [--app-name=...] [--version=...]
```

Examples:

```bash
node tools/sn-deployment-packager/build.js delivery-methodology
node tools/sn-deployment-packager/build.js delivery-methodology --version=1.2.0 --scope=x_2168882_dlvry_2
```

Output lands under `apps/<app-folder>/deploy/fluent/` (and a `.zip` of the project in project mode).

## Tables and roles

Optional `manifest.tables[]` emits Fluent `Table()` files (see `manifest.schema.md`). Optional
`roles.editorRoleName` adds a third role between user and admin; content-table write ACLs go to
editor + admin. Delivery Methodology is the first consumer (`content` table + three roles).

## Adding a new deployable app

1. Add `apps/<app>/deploy.manifest.js` (see `manifest.schema.md`).
2. Add the folder name to `KNOWN_APP_FOLDERS` in `console.js`.

## Related files

- `manifest.schema.md` - manifest / sources contract for developers
- `core.js` - record model + extraction / scoping (shared by Fluent emit)
- `fluent.js` - Fluent / Now SDK emitter
- `semver.js` - version bump + Fluent-diff suggestions
- `instance.js` - live Connect / detect (browser only)
- `sdk-bridge.js` - localhost bridge: Connect credentials → `now-sdk` auth/install + NDJSON progress
- `build.js` - Node CLI
- `zip.js` - optional on-disk Fluent zip for CLI builds
