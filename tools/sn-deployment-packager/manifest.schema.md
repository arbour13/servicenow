# Manifest schema

`core.js` takes two inputs per build: a **manifest** (this app's static
identity/config - the only thing that lives in the app) and **sources** (already-fetched
source text - fetching is the host's job, never the core's). This file documents both, plus
the small `opts` bag `buildParts` takes. Fluent emit is `fluent.js`'s `assembleFluent`.

## manifest

```js
{
  // --- identity ---
  appName: 'Glide Studio',              // required
  scope: 'x_glide_studio_ng',           // required. Fixed, or derived at runtime via
                                         // core.deriveScope(appName, companyCode) - see
                                         // "Dynamic scope" below.
  vendorPrefix: 'x_glide_studio',       // optional - derived from scope if omitted
  version: '1.0.0',                     // optional - defaults to '1.0.0'
  shortDescription: '...',              // optional - defaults to appName
  urlSuffix: 'glide-studio-ng',         // required when features.portal is on; also seeds page/widget
                                         // id (hyphens→underscores) unless pageId/widgetId set
  pageId: undefined,                     // optional - sp_page.id / sys_name
  pageTitle: undefined,                  // optional - sp_page.title + "{title} - Container 1"
  widgetId: undefined,                   // optional - sp_widget.id (default: same as pageId)

  // --- sys_id derivation (see core.js header comment) ---
  // A short, distinctive string unique to THIS app, so its derived sys_ids never collide with
  // another app's if both packages are imported into the same instance. Pick one and never
  // change it - every sys_id this app's records use is derived from it, so changing it is
  // equivalent to deploying a brand-new app rather than updating the existing one.
  sysIdPrefix: 'b2c3d4e5f6',            // required

  // --- Angular wiring ---
  angularModuleName: 'glideStudio',     // required - the angular.module(...) name in source
  widgetScopeClass: 'gsb-widget',       // required - CSS wrapper class scopeScss() scopes under,
                                         // and the class the widget template is wrapped in
  controllerAs: 'vm',                   // optional - sp_widget.controller_as / SPWidget.controllerAs.
                                         // Defaults to 'vm' (what Glide Studio + Standards already
                                         // ship). Service Portal's platform default is 'c'; set
                                         // that here if the template/controller use `c.` bindings.

  // one entry per file that registers an Angular provider (MainController is NOT listed here -
  // it becomes the widget's client_script via `controllerFile` below, not a provider)
  providers: [
    { file: '/angular/js/services/schema.service.js', name: 'SchemaService', type: 'service' },
    { file: '/angular/js/directives/gs-select.directive.js', name: 'gsSelect', type: 'directive',
      // optional: a one-off trailing top-level statement after this file's own .directive() call
      // (e.g. a shared document-scroll listener) - see extractTrailingMarker's doc comment.
      trailingMarker: "document.addEventListener('scroll'" },
  ],

  // dev-harness-only services the controller injects that must NOT ship as real providers (the
  // deployed widget never calls into them - guarded behind an ng-if the deployed page never
  // satisfies) but still need an empty stub so AngularJS's injector resolves at instantiation.
  stubProviders: ['DeployModalService'],  // optional, defaults to []

  // --- opt-in / opt-out layers ---
  features: {
    roles: true,       // optional, defaults to {} (no roles/groups/ACLs when omitted/false)
    // portal + theme default ON when omitted. Set false to ship widget+page without scaffolding
    // a dedicated Service Portal / theme (drop the page into an existing portal instead).
    // portal: false, theme: false,
  },
  roles: {                                // required if features.roles is true
    userRoleName: 'glide_studio_user', adminRoleName: 'glide_studio_admin',
    userGroupName: 'Glide Studio Users', adminGroupName: 'Glide Studio Admins',
    // each *Description is optional - a sensible default is generated from appName if omitted
  },
}
```

### Dynamic scope

Standards hardcodes `scope`. Glide Studio derives it per deploy from the app name + the target
instance's detected vendor prefix, so the Deploy modal can offer a recommended scope. That
detection needs a network call (`detectCompanyPrefix`), which is host-owned (see below) - but the
pure slug/truncation logic is in the core: `core.deriveScope(appName, companyCode)`,
`core.scopeSlug(s)`, `core.SCOPE_MAX` (18, ServiceNow's cap on a full `x_<code>_<app>` scope).

## sources

Everything the core needs to *read*, already fetched as plain strings - `fetch()` in a browser
host, `fs.readFileSync` in a Node host. The core never touches the filesystem or network itself.

```js
{
  controllerSrc: '...',                 // full text of the file wiring the widget's controller
  scssSrc: '...',                       // full text of the app's authored SCSS source
  sharedScss: undefined,                // optional - shared SCSS partial text (e.g. the concatenated
                                         // contents of a design-token file this app opts into via
                                         // manifest.sharedScssPartials, below). Prepended to scssSrc
                                         // before scoping, so it lands at the TOP of the widget's
                                         // <css> as `!default` tokens. No app currently uses this -
                                         // the general mechanism stays, so a future shared-token
                                         // source can plug in without a core.js change.
  indexHtml: '...',                     // full text of the authored page markup
  providerSrcs: {                       // keyed by each providers[].file entry above
    '/angular/js/services/schema.service.js': '...',
    // ...
  },
  serverScript: undefined,              // optional - raw text for the widget's server script;
                                         // a generic no-op stub is used if omitted
  link: undefined,                      // optional - raw text for the widget's Link function
}
```

## opts

- `buildParts(manifest, sources, opts)` - `opts.formatFn`: optional `(code) => code` passed over
  every extracted script body (e.g. a browser host wiring in js-beautify). Defaults to identity.
- `assembleFluent(manifest, parts, opts)` (in `fluent.js`) - `opts.mode`: `'project'` | `'files'`;
  `opts.sdkVersion` overrides the pinned SDK dependency in generated `package.json`.

## Host responsibilities (not in the core)

- **Fetching** every source file (`fetch()` vs `fs.readFileSync`).
- **The deploy console UI** (browser-only) - Connect form, Fluent preview, version suggestion,
  Deploy with Now SDK progress modal. `tools/sn-deployment-packager/index.html` is the one such
  host in this suite. Review app source in VS Code and the app's local harness; this host packages
  and deploys via the SDK bridge.
- **Live-instance connection** - `deployFetch`/`detectCompanyPrefix`/`getInstalledApp`/
  `getScopeOccupant` (network I/O, read-only). Shared as
  `tools/sn-deployment-packager/instance.js` (`window.SNDeploymentPackager.instance`) for apps with
  `deployOptions.showConnection: true`.
- **SDK install** - `tools/sn-deployment-packager/sdk-bridge.js` on `127.0.0.1:17345` (NDJSON
  progress on `POST /auth` and `POST /deploy`).
- **Code formatting** (js-beautify or equivalent) - pass it in as `opts.formatFn`.
- **Semver suggestions** - `semver.js` (`suggestRelease`) diffs Fluent sources vs the prior build.

## `deploy.manifest.js` - the per-app descriptor file

Every deployable app declares ONE `deploy.manifest.js` at its own root (`apps/<app>/deploy.manifest.js`)
- a UMD file, same pattern as `core.js`, so it loads unchanged via `require()` in Node
and `<script src>` in a browser. This is the single source of truth for that app's manifest: an
app's own build host (`scripts/build-deploy.js`, or a live Deploy modal's service) reads it, and so
does the shared **deploy console** (`tools/sn-deployment-packager/index.html` - see below), so no app's
manifest is ever hand-copied into a second place.

An app with no `deploy.manifest.js` is simply not deployable by any host - the deploy console
treats a missing file (404 / load error) as "not eligible," not an error to fix.

Set `deployable: false` on the descriptor to keep the manifest on disk (for reference or a future
re-enable) while hiding the app from the deploy console and rejecting it from `build.js`. Omit the
key or set `true` to stay deployable (default).

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SNAppManifests = root.SNAppManifests || {}; root.SNAppManifests['<app-folder-name>'] = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    deployable: true,                   // optional - default true; false = keep file, packager skips
    manifest: { /* the manifest object documented above, unchanged shape */ },
    // Every path below is relative to THIS FILE'S OWN FOLDER (the app root) - a generic host
    // resolves them uniformly: fs.readFileSync(path.join(appRoot, p)) in Node,
    // fetch(appRootUrl + '/' + p) in a browser. manifest.providers[].file follows the same rule.
    files: {
      controller: 'js/controllers/main.controller.js',
      scss: 'scss/app.scss',
      index: 'index.html',
    },
    serverScriptSource: undefined,      // optional inline string - omit to use the SN Deployment Packager's built-in stub
    sharedScssPartials: undefined,      // optional array of app-root-relative paths to shared SCSS
                                         // partials (e.g. a design-token file); each host reads and
                                         // concatenates them, passing the text as sources.sharedScss
    deployOptions: undefined,           // optional - see below
  };
});
```

### `deployOptions` - per-app Deploy UI configuration

Optional. Controls what a Deploy UI (a live modal, or the standalone deploy console) shows for
THIS app, since not every app's manifest needs the same fields:

```js
deployOptions: {
  // Show the "Deploy target instance" panel (Instance URL / Username / Password / Detect Prefix
  // button) - live Basic-Auth calls (see instance.js) that read the target instance's vendor
  // prefix AND look up whether this app is already installed there (by its own deterministic
  // sys_id - independent of scope/company code). If a saved connection already has all three
  // fields filled in, this runs automatically on app selection, no button click needed. Found an
  // existing install: App name/Scope become the REAL installed values (so redeploying updates the
  // same app instead of drifting to a new scope every time), Version is bumped from the installed
  // one as a starting suggestion. Nothing found: Scope becomes just the bare "x_<companycode>_"
  // prefix (via core.js's deriveScopePrefix - deliberately NOT combined with any app-name guess,
  // see that function's own comment for why), left for whoever's deploying to finish typing.
  // Only meaningful for an app whose scope should vary per target instance (today: Glide Studio).
  // Omit/false for an app with a fixed scope (Standards) - App name/Scope/Version stay plain
  // editable fields with no connection UI. Default: false.
  showConnection: true,

}
```

```js
deployOptions: {
  // ... showConnection above ...
  // Optional per-app Fluent (Now SDK) output tuning. The Fluent target is available for EVERY app
  // regardless of this key (it needs no opt-in) - this only overrides defaults when present.
  fluent: {
    sdkVersion: 'latest',   // the @servicenow/sdk / @servicenow/glide version pinned in the
                            //   generated package.json (default 'latest').
  },
}
```

App name/Scope/Version are always shown and editable for every app regardless of `deployOptions`;
`showConnection` only toggles the extra live-connection affordance, and `fluent` only tunes the
Fluent output. Add further `deployOptions` fields here if a future Deploy-UI toggle turns out to be
genuinely per-app (don't add one speculatively).

The browser key (`root.SNAppManifests['<app-folder-name>']`) is keyed by the app's own folder name
under `apps/` (e.g. `'glide-studio'`, `'standards'`) - the same name the deploy console uses to probe for
it, so no separate registry has to map folder → key.

## One output target, one shared record model

`buildParts()` extracts an app's content once; `buildRecordModel(manifest, parts)` (also in
`core.js`) is the ONE place that then knows which ServiceNow records + fields make up a
package - an ordered array of `{ table, sysId, key, fields }`, where each field is `{ name, value }`
plus markers (`cdata` / `empty` / `scopeTag` / `xmlOnly` — historical field tags still used so
Fluent can filter bookkeeping). The Fluent emitter walks this model:

- `fluent.js`'s **`assembleFluent(manifest, parts, opts)`** → a **file-map**
  (`{ 'relative/path': 'contents' }`) making up a ServiceNow **Now SDK / Fluent** TypeScript project.
  `opts.mode` is `'project'` (full runnable project: `package.json`, `now.config.json`,
  `src/fluent/generated/keys.ts`, `README`) or `'files'` (just the `src/fluent/**` tree, to drop
  into an existing SDK project). `opts.sdkVersion` overrides the pinned SDK dependency.

Every record's sys_id comes from `deriveSysIds()` / `stableSysId()`, so reinstalls update in place.
Adding a field to an existing record type means editing `buildRecordModel` once. Only two record
types need emitter-specific handling: `sp_widget` and `sp_angular_provider` (typed
`SPWidget`/`SPAngularProvider`). Everything else uses generic `Record({ $id, table, data })`.
Fluent filters out `xmlOnly`/`scopeTag`/`empty` fields. The widget lists Angular providers on
`SPWidget.angularProviders` for the widget↔provider m2m. `sys_app` identity becomes
`now.config.json`'s `scopeId` (no Fluent `Record()` for the app itself).

The Node CLI may zip the file-map via `zip.js` for an on-disk artifact; the console deploys through
the SDK bridge instead of downloading packages.

## Node CLI: `tools/sn-deployment-packager/build.js`

```bash
node tools/sn-deployment-packager/build.js <app-folder> [--fluent-mode=project|files]
  [--scope=...] [--app-name=...] [--version=...]
```

Writes `apps/<app-folder>/deploy/fluent/` (and optionally `<app>-fluent.zip` in project mode).
XML Update Set export was removed — use the Now SDK path only.

## Styling: no separate Theme/CSS-Include

There is no `sp_css` or `m2m_sp_theme_css_include` record in this core, and `sp_theme` never
carries this app's own tokens. Each widget's `<css>` field is the *sole* styling carrier: it's the
app's entire authored SCSS source, run through `scopeScss()` once. Because `scopeScss` leaves bare
`$token: value !default;` statements untouched, that one field ends up holding *both* the app's
`!default` token declarations *and* its scoped rules - self-sufficient wherever the widget is
dropped. See `core.js`'s header comment for the full reasoning.
