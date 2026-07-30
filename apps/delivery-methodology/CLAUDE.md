# Delivery Methodology — app notes

Suite rules in the repo-root `CLAUDE.md` apply. Additions for this app:

## Multi-widget split (five widgets, one deployed app)

This app deploys as **five** Service Portal widgets, not one. There is no `MainController` any
more — it was split into:

- **Shell** (`js/controllers/shell.controller.js`, `partials/shell.html`) — the page chrome:
  pagehdr (view tabs, search, history nav, theme toggle), tip/toast/confirm overlays, search
  overlay, loading state. Always mounted. Owns the bootstrap `getData()` / `applyLoadedData()`
  flow via `AppStateService`, and is the **only** widget that calls `ContentEditService.bind()` /
  `StructureEditService.bind()` / `NavigationService.bind()` — the four view widgets read those
  services' shared state but must not re-bind them.
- **Methodology** (`methodology.controller.js` + `partials/methodology.html`) — visible when
  `AppStateService.getView() === 'methodology'`.
- **RACI** (`raci.controller.js` + `partials/raci.html`).
- **Reference** (`reference.controller.js` + `partials/reference.html`).
- **What's New** (`whatsnew.controller.js` + `partials/whatsnew.html`).

Each widget is its own Angular scope/controller instance — there is no parent-child relationship
between Shell and the four view widgets. Cross-widget sync happens through shared singleton
services plus an explicit broadcast: `AppStateService` injects `$rootScope` and calls
`$rootScope.$broadcast('dm-state')` from every mutator (`setView`, `setSubPhaseId`,
`refreshLocation`, `applyLoadedData`, …); every controller listens with
`$rootScope.$on('dm-state', syncAll)` and mirrors the fields it needs onto `c`. Services whose
own mutators already run inside an Angular digest (e.g. `ContentEditService`'s field mutators,
which rely on the shared `editSubPhase` object reference; `TipService`, which relies on
`$timeout`'s implicit digest) intentionally do **not** broadcast — see the mutators themselves
for per-service reasoning before adding more broadcasts. Since `$rootScope` outlives any one
widget's controller, every controller injects `$scope` alongside `$rootScope` and unsubscribes
its own listener on teardown:
`var unsubscribe = $rootScope.$on('dm-state', syncAll); $scope.$on('$destroy', unsubscribe);` —
without this, a destroyed widget's stale listener keeps firing (and leaking) every time any other
widget broadcasts.

Each view widget's own root partial div carries its own `ng-mouseover` / `ng-mouseout` / `ng-click`
tip-delegation handlers (`TipService`) and, where relevant, its own `ng-class="{editing: ...}"` —
a deliberate, accepted regression from the pre-split single-DOM version: EDIT-mode dimming no
longer cascades across widget boundaries (entering edit mode in Methodology no longer dims
RACI/Reference, since they're separate widgets/DOM trees). SEARCH dimming was later restored
across widgets a different way: every view partial's root carries
`class="view-root" ng-class="{'view-blur': c.searchOpen()}"` (each view controller exposes
`c.searchOpen = SearchService.isOpen`), so each widget blurs its own DOM while the Shell's search
overlay is open. Shell's own `.app` wrapper keeps `editing` / `search-active` classes for the
chrome it still owns (pagehdr, etc).

`deploy.manifest.js` declares all five in `manifest.widgets` (see
`tools/sn-deployment-packager/manifest.schema.md`); `shell` is the only entry with
`serverScript: true` — the other four get the packager's noop server script stub.

## Template-facing API

Each widget's template binds a full-name public surface on its own `c` (suite Scripting style —
no abbreviation keys):

- Session / location: `c.location`, `c.location.subPhase`, `c.view`, `c.methodologyId`,
  `c.subPhaseId`, `c.currentMethodology()`
- RACI: `c.raciGrid` (`roleIds` / `roleCounts` / `groups` / `byRoleGroups`), `c.activePhases`,
  `c.gridFocusRoleId`, `c.byRoleFocusRoleId`, `c.raciMode`, plus `toggleRaciPhase` /
  `toggleRaciColumn` / `clearRaciFocus` / `setRaciMode` / `selectRaciByRole`
- Edit: `c.editSubPhase`, `c.editMode`, `c.tmpAddJobTitle`, `c.tmpLevelOfEffortRoleId`,
  structure mirrors (`c.structureEditMode`, …)
- Search / What's New / Reference payloads use `methodology` / `phase` / `subPhase` (not `m`/`p`/`s`)

CSS class names (`.rg-table`, `.sp-brief`, …) and persisted content fields (`sid`, `abbr`) are
separate from this binding API and were not renamed.

## Source layout

- Live app harness: `index.html` mounts all five widgets as sibling `ng-controller` divs; Shell
  uses `ng-include="'partials/shell.html'"`, each view widget wraps its partial in
  `<div class="app app--view" ng-if="c.isActiveView()">`. `ng-controller` and `ng-if` are never on
  the same element — `ngIf` is terminal and would keep the controller from ever binding, so
  `ng-if` always gates an inner div instead.
- `.app--chrome` (Shell's own wrapper) and `.app--view` (each view widget's wrapper) are separate
  modifiers on the shared `.app` base class specifically so each carries its own padding — Shell's
  pagehdr chrome and a view widget's content used to double up on the same `.app` padding when
  both were plain `.app`, producing an oversized gap under the pagehdr.
- Session spine: `AppStateService`; tree lookups: `MethodologyDomainService`
- Icons: `IconService` owns both sub-phase filmstrip glyphs (`pathsFor` → `c.subPhaseIconPaths`)
  and chrome UI glyphs (`paths('chevronUp')` → `c.icon` via `IconService.bind(c)`). Templates keep
  the outer `<svg …>` shell (stroke/size/class) and inject path markup with `ng-bind-html`.
- Shared controller chrome (DRY): `TipService.bind(c)` attaches tip / tipMouseOver / tipMouseOut /
  dismissTip (do not re-wrap those per controller); `AppStateService.bindActiveView(c, view)` +
  `AppStateService.subscribe($rootScope, $scope, syncAll)` for view gating and dm-state teardown;
  `RaciGridService.bindLegend(c)` for RACI letter/name/hex maps; `MethodologyDomainService.phaseColor`
  is the single phase-color source (Whats New / RACI grid / Methodology filmstrip).
- Packager inlines each widget's `templatePartial` (wrapped with the `.app app--view`/`ng-if`
  shell shown above) or `templateFile` (used as-is, for `shell.html`) per `manifest.widgets[]` —
  see `tools/sn-deployment-packager/manifest.schema.md`.

## Roles

Role names are prefixed (`delivery_methodology_user` / `_editor` / `_admin`, not bare
`user`/`editor`/`admin`) in `deploy.manifest.js`'s `roles` block, matching every other app in this
suite (see repo-root `CLAUDE.md`'s sys_id-collision reasoning — same idea applies to role names in
a shared instance). `js/server/content.server.js`'s `gs.hasRole(...)` calls must use the exact
same prefixed strings; there is no indirection between the manifest and the server script literal,
so a rename in one requires the matching rename in the other.
