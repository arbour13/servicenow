# Manifest schema

`core.js` takes two inputs per build: a **manifest** (this app's static
identity/config — the only thing that lives in the app) and **sources** (already-fetched
source text — fetching is the host's job, never the core's). This file documents both, plus
the small `opts` bag `buildParts`/`assembleXml` take.

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
  urlSuffix: 'glide-studio-ng',         // required - the portal's url_suffix

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

  // --- opt-in superset layer ---
  features: { roles: true },              // optional, defaults to {} (no roles/groups/ACLs)
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
- `assembleXml(manifest, parts, opts)` - `opts.stamp`: **required**. The core never calls `Date()`
  itself, so the same manifest + same parts always produce byte-identical XML unless the host
  deliberately supplies a fresh wall-clock stamp (a live-deploy host) or a fixed one (a
  build-script host that wants reproducible diffs).

## Host responsibilities (not in the core)

- **Fetching** every source file (`fetch()` vs `fs.readFileSync`).
- **The deploy modal UI** (browser-only) - option form, connection fields, theming, copy/download.
  There's no single generic UI file; each host implements its own (e.g. Glide Studio's own Deploy
  modal). `tools/sn-deployment-packager/index.html` is a shared instance of this host that
  works across every app with a `deploy.manifest.js` (see above), instead of each app growing its
  own copy - use it when you want to build/preview/download a package outside of any one app's own
  dev harness.
- **Live-instance connection** - `deployFetch`/`detectCompanyPrefix`/`getInstalledApp`-style calls
  (network I/O). Shared between browser hosts as `tools/sn-deployment-packager/instance.js`
  (`window.SNDeploymentPackager.instance`) rather than each one keeping its own copy - load it
  via `<script src>` for any app with `deployOptions.showConnection: true`.
- **Code formatting** (js-beautify or equivalent) - pass it in as `opts.formatFn`.
- **The timestamp** - pass it in as `opts.stamp`.

## `deploy.manifest.js` — the per-app descriptor file

Every deployable app declares ONE `deploy.manifest.js` at its own root (`apps/<app>/deploy.manifest.js`)
- a UMD file, same pattern as `core.js`, so it loads unchanged via `require()` in Node
and `<script src>` in a browser. This is the single source of truth for that app's manifest: an
app's own build host (`scripts/build-deploy.js`, or a live Deploy modal's service) reads it, and so
does the shared **deploy console** (`tools/sn-deployment-packager/index.html` - see below), so no app's
manifest is ever hand-copied into a second place.

An app with no `deploy.manifest.js` is simply not deployable by any host - the deploy console
treats a missing file (404 / load error) as "not eligible," not an error to fix.

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SNAppManifests = root.SNAppManifests || {}; root.SNAppManifests['<app-folder-name>'] = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
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

### `deployOptions` — per-app Deploy UI configuration

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

## Two output targets, one shared record model

`buildParts()` extracts an app's content once; `buildRecordModel(manifest, parts)` (also in
`core.js`) is the ONE place that then knows which ServiceNow records + fields make up a
package - an ordered array of `{ table, sysId, key, fields }`, where each field is `{ name, value }`
plus a marker (`cdata: true` for a long script/template/css body, `empty: true` for a self-closing
tag, `scopeTag: true` for the `<sys_scope>` tag itself, `xmlOnly: true` for bookkeeping fields only
XML needs). Two thin emitters walk this SAME model:

- `core.js`'s **`assembleXml(manifest, parts, opts)`** → one Retrieved Update Set `<unload>`
  string, importable via **System Update Sets → Retrieved Update Sets → Import Update Set from
  XML**. `buildRecordModel`'s flat record list is NOT emitted directly (that would be a plain
  per-table XML export, which the Retrieved Update Set importer doesn't recognize as anything to
  do) - `wrapAsUpdateSet()` wraps it first: one `sys_remote_update_set` header record, then one
  `sys_update_xml` per model record, each carrying that record's own rendered XML (from the SAME
  `renderXmlRecord` used before) escaped inside a `<record_update table="...">...</record_update>`
  `payload` CDATA. `renderXmlRecord` CDATA-wraps `cdata` fields (nesting safely under the payload's
  own CDATA - `cdata()`'s `]]>` escaping handles arbitrary nesting depth) and self-closes `empty`
  ones; field order comes straight from the model. `wrapAsUpdateSet` runs XML-only, inside
  `assembleXml` - `fluent.js` never sees it, since Fluent installs directly via the Now SDK with no
  Update Set concept at all.
- `fluent.js`'s **`assembleFluent(manifest, parts, opts)`** → a **file-map**
  (`{ 'relative/path': 'contents' }`) making up a ServiceNow **Now SDK / Fluent** TypeScript project.
  `opts.mode` is `'project'` (full runnable project: `package.json`, `now.config.json`,
  `src/fluent/generated/keys.ts`, `README`) or `'files'` (just the `src/fluent/**` tree, to drop
  into an existing SDK project). `opts.sdkVersion` overrides the pinned SDK dependency.

Both share identity: every record's sys_id comes from the same model (`deriveSysIds()`/
`stableSysId()`), so the two outputs describe the *same* records - installing one over the other
updates in place. Adding a field to an existing record type (e.g. a new `sp_container` property)
means editing `buildRecordModel` ONCE - both emitters pick it up automatically. Only two record
types need emitter-specific handling at all: `sp_widget` and `sp_angular_provider`, because Fluent
has TYPED `SPWidget`/`SPAngularProvider` APIs for those (verified against `ServiceNow/sdk-examples`)
with different field NAMES than XML uses (`client_script`→`clientScript`, `script`→`serverScript`,
`css`→`customCss`, `template`→`htmlTemplate`, `link`→`linkScript`) and their `cdata` fields become
external files via `Now.include` rather than inline data. Everything else (page tree, portal, theme,
roles/ACL layer) has no typed Fluent API and is emitted via the **generic `Record({ $id, table,
data })`** API, exactly as the official sample does - Fluent's emitter just filters out each
record's `xmlOnly`/`scopeTag`/`empty` fields and passes the rest straight through as `data`. The
widget lists no `angularProviders` (providers register globally and inject by name at runtime -
same as the XML path, which creates no widget→provider m2m link). The `sys_app` record has no
Fluent Record() equivalent at all (an app's identity is its `now.config.json`, not metadata), so
Fluent's emitter skips it entirely - its sys_id still becomes `now.config.json`'s `scopeId`.

The host owns **zipping/delivery** of the file-map - both the browser deploy console and the Node
CLI below use the dependency-free `zip.js` (store-only; `window.SNDeploymentPackager.zip` in a
browser, `module.exports` in Node) to hand it over as one `.zip`.

## Node CLI: `tools/sn-deployment-packager/build.js`

Generic build script - works for ANY app with a `deploy.manifest.js`, writing output into that
app's own `apps/<app>/deploy/` folder so a build is just a file on disk (checked into git like
anything else), not only ever a browser download:

```bash
node tools/sn-deployment-packager/build.js <app-folder> [--format=xml|fluent|both] [--fluent-mode=project|files]
```

Writes `<app-folder>-update-set.xml` (XML), `fluent/**` + `<app-folder>-fluent.zip` (Fluent, project
mode), or both (default). Uses the same `buildRecordModel`-backed pipeline as the deploy console, so
output is identical either way. Note: Standards' existing `scripts/build-deploy.js` still exists and
writes to its own historically-named file (`standards-portal-update-set.xml`) - this CLI writes
alongside it under a folder-name-based filename (`standards-update-set.xml`), not in place of it.

## Styling: no separate Theme/CSS-Include

There is no `sp_css` or `m2m_sp_theme_css_include` record in this core, and `sp_theme` never
carries this app's own tokens. Each widget's `<css>` field is the *sole* styling carrier: it's the
app's entire authored SCSS source, run through `scopeScss()` once. Because `scopeScss` leaves bare
`$token: value !default;` statements untouched, that one field ends up holding *both* the app's
`!default` token declarations *and* its scoped rules - self-sufficient wherever the widget is
dropped. See `core.js`'s header comment for the full reasoning.
