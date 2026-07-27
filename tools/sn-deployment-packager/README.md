# ServiceNow Deployment Packager

Build a scoped-app package (Update Set XML or Fluent / Now SDK project) for any suite app that has a `deploy.manifest.js`.

This folder is **build tooling** - it never ships into ServiceNow. The browser console and the Node CLI share the same core (`core.js` / `fluent.js`).

## Open the console

1. Serve the **suite root** (the folder that contains `apps/` and `tools/`), not this file alone. Relative paths to `apps/<app>/…` only resolve from there.
2. Open `/tools/sn-deployment-packager/` (trailing slash).
3. Pick an app from the dropdown. Only folders listed in `console.js`’s `KNOWN_APP_FOLDERS` that also have a `deploy.manifest.js` with `deployable` not set to `false` appear.

Example (from the suite root):

```bash
npx --yes serve -l 4173 .
# then open http://localhost:4173/tools/sn-deployment-packager/
```

## What to pick: XML vs Fluent

| Format | Use when | What you get |
| --- | --- | --- |
| **Update Set XML** | You want a classic Retrieved Update Set import | Download `.xml`, or **Upload** (connection-enabled apps) straight into Retrieved Update Sets |
| **Fluent project** | You deploy with the ServiceNow Now SDK | Download `.zip` (`package.json`, `now.config.json`, `src/fluent/**`, README) |

Upload and Fluent deploy both stop short of a blind production apply: **Upload does not commit** the Update Set - preview and commit in the instance UI. Fluent uses the SDK’s own `build` / `deploy` flow after you unzip.

## Connection panel (some apps only)

Apps with `deployOptions.showConnection: true` (e.g. Glide Studio, Delivery Methodology) show Instance URL / credentials:

- **Connect** detects the vendor prefix and whether this app is already installed (by deterministic `sys_id`).
- **Upload** (XML only) writes records into Retrieved Update Sets via the Table API.

Apps without that flag (e.g. Standards) use a **fixed App ID** from their manifest. Download is ready as soon as the app builds; there is no Upload button.

### Connect / CORS

Connect runs from your browser to the instance origin. It needs:

- A reachable instance URL and valid Basic-Auth credentials with Table API access
- **CORS** allowed from this console’s origin to that instance

If Connect fails with a network / “Failed to fetch” style error, allow CORS on the instance or **Download** the XML and import it under **System Update Sets → Retrieved Update Sets → Import Update Set from XML**.

Saved connection passwords are stored in this browser’s `localStorage` (convenient for a personal tool; don’t treat that as a secrets vault).

## Node CLI (no browser)

```bash
node tools/sn-deployment-packager/build.js <app-folder> [--format=xml|fluent|both] [--fluent-mode=project|files]
```

Examples:

```bash
node tools/sn-deployment-packager/build.js glide-studio --format=fluent
node tools/sn-deployment-packager/build.js standards --format=both
node tools/sn-deployment-packager/build.js delivery-methodology --format=xml
```

Output lands under `apps/<app-folder>/deploy/`.

## Adding a new deployable app

1. Add `apps/<app>/deploy.manifest.js` (see `manifest.schema.md`).
2. Add the folder name to `KNOWN_APP_FOLDERS` in `console.js`.

## Related files

- `manifest.schema.md` - manifest / sources contract for developers
- `core.js` - record model + XML assembly
- `fluent.js` - Fluent / Now SDK emitter
- `instance.js` - live Connect / Upload (browser only)
- `build.js` - Node CLI
