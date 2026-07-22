api.controller = function ($scope, $sce, $timeout, SchemaService, CodegenService, AggregateService, AjaxService, EncoderService, ScriptIncludeService, GlideQueryService, ExampleCallService, SchemaLiveService, ThemeService, DeployModalService, SchemaUiService, ConnectionUiService, ConfirmModalService, PreviewUiService, StandardsUiService) {
    'use strict';
    var vm = this;

    // Theme (the app-wide light/dark, plus the output pane's own light/dark/auto editor theme) is
    // owned by ThemeService - it persists both to localStorage and applies the app theme to
    // documentElement. vm holds display mirrors the template reads (vm.theme / vm.editorTheme /
    // vm.editorThemeApplied); syncTheme() refreshes them from the service after each toggle. Toggling
    // the app theme also re-resolves the editor mirror, since an "auto" editor tracks the app theme.
    // ThemeService is the shared Core provider; init it with this app's own key prefix so Glide
    // Studio keeps its independent stored theme choice ('glideStudioTheme'/'glideStudioEditorTheme').
    ThemeService.init('glideStudio');
    function syncTheme() {
      var t = ThemeService.readState();
      vm.theme = t.theme;
      vm.editorTheme = t.editorTheme;
      vm.editorThemeApplied = t.editorApplied;
    }
    syncTheme();
    vm.editorThemeLabel = ThemeService.editorLabel;
    vm.toggleTheme = function () { ThemeService.toggleApp(); syncTheme(); };
    vm.cycleEditorTheme = function () { ThemeService.cycleEditor(); syncTheme(); };

    // $sce.trustAsHtml once here (static, not user input) so ng-bind-html can render these SVGs.
    var MODE_ICONS = {
      GlideRecord: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="1.5" y="1.5" width="15" height="15" rx="2.5"/><path d="M1.5 6.5h15M1.5 11h15M8.5 6.5V16.5"/></svg>',
      GlideQuery: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3h13l-5 6.5v5l-3 1.5v-6.5z"/></svg>',
      GlideAggregate: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2" y="10" width="3.5" height="6.5" rx="1" fill="currentColor"/><rect x="7.25" y="6" width="3.5" height="10.5" rx="1" fill="currentColor"/><rect x="12.5" y="2" width="3.5" height="14.5" rx="1" fill="currentColor"/></svg>',
      GlideAjax: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h12M12 4l3 3-3 3"/><path d="M15 11H3M6 8l-3 3 3 3"/></svg>',
      ScriptInclude: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 5.5L3 9l3.5 3.5M11.5 5.5L15 9l-3.5 3.5"/><path d="M10.5 3.5l-3 11"/></svg>',
      Encoder: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5"/><path d="M12 12l4.5 4.5M6 8h4M8 6v4"/></svg>',
      Standards: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      Settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    };
    // A separate 24px icon set (same paths, larger) for the content pane's page-title header -
    // ported from the original's MODE_INFO (distinct from its 18px sidenav icons, see above).
    var HEADER_ICONS = {
      GlideRecord: '<svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="1.5" y="1.5" width="15" height="15" rx="2.5"/><path d="M1.5 6.5h15M1.5 11h15M8.5 6.5V16.5"/></svg>',
      GlideQuery: '<svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3h13l-5 6.5v5l-3 1.5v-6.5z"/></svg>',
      GlideAggregate: '<svg width="24" height="24" viewBox="0 0 18 18" aria-hidden="true"><rect x="2" y="10" width="3.5" height="6.5" rx="1" fill="currentColor"/><rect x="7.25" y="6" width="3.5" height="10.5" rx="1" fill="currentColor"/><rect x="12.5" y="2" width="3.5" height="14.5" rx="1" fill="currentColor"/></svg>',
      GlideAjax: '<svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h12M12 4l3 3-3 3"/><path d="M15 11H3M6 8l-3 3 3 3"/></svg>',
      ScriptInclude: '<svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 5.5L3 9l3.5 3.5M11.5 5.5L15 9l-3.5 3.5"/><path d="M10.5 3.5l-3 11"/></svg>',
      Encoder: '<svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5"/><path d="M12 12l4.5 4.5M6 8h4M8 6v4"/></svg>',
      Standards: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      Settings: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    };
    vm.modes = [
      { key: 'GlideRecord', name: 'GlideRecord', sub: 'Query & modify records', ready: true },
      { key: 'GlideQuery', name: 'GlideQuery', sub: 'Fluent, null-safe queries', ready: true },
      { key: 'GlideAggregate', name: 'GlideAggregate', sub: 'Count, sum & group records', ready: true },
      { key: 'GlideAjax', name: 'GlideAjax', sub: 'Call the server from the client', ready: true },
      { key: 'ScriptInclude', name: 'Script Include', sub: 'Build reusable server-side classes', ready: true },
      { key: 'Encoder', name: 'Encoded Query', sub: 'Build encoded query strings', ready: true },
      { key: 'Standards', name: 'Standards', sub: 'GlideFast scripting best practices', ready: true },
      { key: 'Settings', name: 'Settings', sub: '', ready: true },
    ];
    vm.modes.forEach(function (m) {
      m.icon = $sce.trustAsHtml(MODE_ICONS[m.key] || '');
      m.headerIcon = $sce.trustAsHtml(HEADER_ICONS[m.key] || '');
    });
    vm.activeMode = 'GlideRecord';
    // vm.previousMode powers the Standards page's "Back to X" button (see openStandard/
    // backFromStandards below) - captured here, not in openStandard, so it's set correctly
    // whichever way Standards is entered (a std-link tip, or clicking Standards in the sidenav
    // directly). Re-captured fresh every time you ENTER Standards, so it can't go stale even if
    // you bounce between several std-link tips before hitting Back.
    vm.previousMode = null;
    vm.selectMode = function (key) {
      if (key === 'Standards' && vm.activeMode !== 'Standards') { vm.previousMode = vm.activeMode; }
      // Leaving Standards always drops focus mode (vm.stdFocusId) AND the scroll-spy rail highlight
      // (vm.activeStdId) - even though this function is defined before either property is
      // initialized below (selectMode is only ever CALLED on a real click, long after construction
      // finishes, so the forward reference is safe - same reasoning as vm.workingTable/
      // vm.ensureFieldsLoaded below). Both are reset for the same underlying reason: the Standards
      // doc is ng-if'd, so leaving and coming back always remounts it fresh at scrollTop 0 - without
      // this, vm.activeStdId kept pointing at whatever section was last scrolled to, so the rail
      // showed a section highlighted that the reader was no longer looking at (the freshly-mounted
      // doc starts at the top, not wherever they'd scrolled to before leaving). The IntersectionObserver
      // set up fresh on re-entry (see the activeMode $watch below) corrects it within one paint once
      // it sees what's actually visible - this reset just closes the gap before that first callback.
      if (vm.activeMode === 'Standards' && key !== 'Standards') { vm.stdFocusId = null; vm.activeStdId = null; vm.stdQuery = ''; vm.stdView = 'overview'; vm.stdExpanded = {}; }
      vm.activeMode = key;
      // The table picker is per-page: entering a table-scoped mode loads THAT mode's own table into
      // the header picker (they no longer share one value), and pre-loads its fields so pickers on
      // the page populate right away - the shared-table version got that for free, per-page needs it
      // explicit. tableForMode / vm.ensureFieldsLoaded are defined later but this only runs on a
      // real click, long after construction, so the forward reference is safe.
      if (vm.usesWorkingTable(key)) {
        vm.workingTable = tableForMode(key);
        vm.ensureFieldsLoaded(vm.workingTable);
      }
    };
    vm.modeName = function (key) {
      var found = null;
      vm.modes.forEach(function (m) { if (m.key === key) { found = m; } });
      return found ? found.name : '';
    };
    vm.backFromStandards = function () { if (vm.previousMode) { vm.selectMode(vm.previousMode); } };
    // {value,label} view of vm.modes for the mobile appbar's <gs-select> (the header dropdown
    // used in place of a native <select> once the sidenav collapses under 920px) - gs-select
    // expects that shape, not vm.modes' own {key, name, ...} objects. Built once; vm.modes never
    // changes after init, so there's no reactivity concern re-deriving it on every digest.
    vm.modeOptions = vm.modes.map(function (m) { return { value: m.key, label: m.name }; });
    vm.activeModeInfo = function () {
      var found = null;
      vm.modes.forEach(function (m) { if (m.key === vm.activeMode) { found = m; } });
      return found;
    };

    // A single shared flag, not one per mode - matches the original's single global
    // state.errorHandling checkbox (syncErrToggles): checking "Add error handling" anywhere turns
    // it on everywhere. The cross-mode $watch below keeps every mode's cached output in sync even
    // when the flag is flipped while looking at a different mode's panel.
    vm.errorHandling = false;

    // Table list and field-name lookups live in SchemaUiService (offline/live swap, memoized
    // fieldNames cache) - passed straight through so the template's existing bindings need no
    // changes. vm.tables mutates in place inside that service (see its own header comment), so this
    // one-time reference copy stays correctly in sync for the life of the app.
    vm.tables = SchemaUiService.tables;
    vm.tableLabel = SchemaUiService.tableLabel;
    vm.fieldNames = SchemaUiService.fieldNames;
    vm.ensureFieldsLoaded = SchemaUiService.ensureFieldsLoaded;
    vm.searchTables = SchemaUiService.searchTables;
    // The header table picker's current value - just a mirror of whatever page you're on (see
    // vm.selectMode / vm.onWorkingTableChange below). The table is per-page now: each mode owns its
    // own table and they don't sync, so this only ever holds the ACTIVE mode's table. Seeded to
    // match GlideRecord's default, the initial active mode.
    vm.workingTable = 'incident';

    /* ============================= Connected mode ============================= */
    // Connection state/lifecycle (credentials, connect/disconnect, the instance-hosted auto-connect)
    // lives in ConnectionUiService - vm.connection is the SAME object that service owns (not a
    // copy), and the rest are direct passthroughs, so the template's existing bindings need no
    // changes.
    vm.connection = ConnectionUiService.connection;
    vm.instanceHosted = ConnectionUiService.instanceHosted;
    vm.pageOrigin = ConnectionUiService.pageOrigin;
    vm.onConnUrlEdit = ConnectionUiService.onUrlEdit;
    vm.connStatusText = ConnectionUiService.statusText;
    vm.connect = ConnectionUiService.connect;
    vm.disconnect = ConnectionUiService.disconnect;
    vm.connLabel = ConnectionUiService.label;
    // The one side effect of connecting that's specific to THIS controller, not to connection state
    // in general: seed the current working table from the real instance the moment we connect -
    // register it into the live table list with its actual instance label (so the picker shows the
    // instance's OWN incident table, not just the bare name string it was defaulted to), and pull
    // its real fields (so field/reference pickers populate immediately). Without this, connecting
    // left the default table unrecognized and every field picker empty until the user re-picked the
    // table by hand. SchemaUiService has its own listener for the tables-list swap; this one is
    // ABOUT vm.workingTable specifically, a per-page concept that service has no notion of.
    $scope.$on('gs:connectionChanged', function (e, status) {
      if (status !== 'connected') { return; }
      vm.ensureFieldsLoaded(vm.workingTable);
      SchemaLiveService.ensureTableRegistered(vm.workingTable, vm.connection).then(function () { $scope.$applyAsync(function () {}); });
    });
    // Generic confirmation modal lives in ConfirmModalService - passed straight through so the
    // template's existing bindings need no changes.
    vm.confirm = ConfirmModalService.confirm;
    vm.openConfirm = ConfirmModalService.open;
    vm.closeConfirm = ConfirmModalService.close;
    vm.confirmAccept = ConfirmModalService.accept;

    vm.resetForm = function () {
      vm.openConfirm({
        title: 'Reset form',
        body: 'This will clear all inputs and return everything to defaults. Your saved connection (instance URL, username, password) is kept.',
        cancel: 'Cancel',
        ok: 'Reset',
      }, function () {
        ConnectionUiService.saveCredentials();
        window.location.reload();
      });
    };

    /* ============================= Deploy ============================= */
    // The Deploy modal (packaging this app as an installable scoped application - App name/Version,
    // a target-instance connection for vendor-prefix detection, a Scope field, and tabs previewing
    // each package piece) lives entirely in DeployModalService: state, tab switching, prefix
    // detection, copy/download. Exposed here as one handle the template binds to (vm.deployUi.*).
    // Dev-harness-only: the Deploy button is hidden when the app runs inside an instance, so none of
    // it runs in the deployed widget (see DeployService.DEPLOYED_STUB_PROVIDERS).
    vm.deployUi = DeployModalService;

    // Read-only record preview (GlideRecord) / stats preview (GlideAggregate) - one shared modal,
    // lives in PreviewUiService. Passed straight through (vm.preview is the SAME object that service
    // owns, not a copy - it mutates the object's properties in place, never reassigns it, so this
    // one-time reference copy stays correctly in sync); vm.previewRecords/vm.previewAggregate supply
    // each mode's own state object, matching how CodegenService/AggregateService already take
    // vm.state/vm.aggState directly. The template's existing bindings needed no changes.
    vm.preview = PreviewUiService.preview;
    vm.closePreview = PreviewUiService.close;
    vm.previewCell = PreviewUiService.cell;
    vm.previewRecords = function () { PreviewUiService.records(vm.state, vm.connection); };
    vm.previewAggregate = function () { PreviewUiService.aggregate(vm.aggState, vm.connection); };

    vm.operations = [
      { value: 'get', label: 'Get a record' },
      { value: 'queryReturn', label: 'Get multiple records' },
      { value: 'insert', label: 'Insert a record' },
      { value: 'updateSingle', label: 'Update a record' },
      { value: 'updateMultiple', label: 'Update multiple records' },
      { value: 'deleteSingle', label: 'Delete a record' },
      { value: 'deleteMultiple', label: 'Delete multiple records' },
    ];
    // Static gs-select {value,label} option lists - all module-level-stable arrays (never
    // reassigned), safe to bind directly through gs-select's isolate `=` scope.
    vm.getMethodOptions = [{ value: 'sysId', label: 'sys_id' }, { value: 'encodedQuery', label: 'Encoded query' }];
    vm.insertStyleOptions = [{ value: 'object', label: 'object (keyed by field name)' }, { value: 'array', label: 'array of {name, value} pairs' }];
    vm.orderDirOptions = [{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }];

    vm.state = {
      table: 'incident',
      varName: 'incidentGr',
      varNameAuto: true,
      operation: 'get',
      getMethod: 'sysId',
      multiAction: 'return',
      fnName: 'getIncident',
      fnParams: 'sysId',
      fnNameAuto: true,
      fnParamsAuto: true,
      useLimit: true,
      limit: 10,
      useChooseWindow: false,
      chooseWindowFirst: 'first',
      chooseWindowLast: 'last',
      orderBys: [],
      insertInputStyle: 'object',
      setWorkflow: false,
      autoSysFields: false,
      withRefs: false,
      secure: false,
      // "Example inputs" - illustrative only, never affect genGlideRecord's output (see
      // ExampleCallService). grArgGroups/exampleQuery feed the encodedQuery-driven ops' example;
      // exampleSysId/sets feed the sys_id/fields-driven ops' example.
      grArgGroups: [{ conds: [{ field: '', op: '=', value: '' }] }],
      exampleQuery: '',
      exampleSysId: '',
      sets: [],
    };

    // CodegenService/ExampleCallService/AggregateService expect a plain "table -> label" map for
    // their tableLabels param; SchemaService exposes the same data as a labelFor(name) function
    // instead (populated live as SchemaLiveService.searchInstanceTables discovers tables). A Proxy
    // bridges the two without changing any of those services' signatures - bracket access
    // (tableLabels[t]) transparently becomes a SchemaService.labelFor(t) call.
    var tableLabels = new Proxy({}, { get: function (target, table) { return SchemaService.labelFor(table); } });

    vm.vis = {};
    vm.fnHint = '';
    vm.multiActionOptions = [];
    vm.exampleCode = '';
    vm.exampleHasHardcodedSysId = false;

    // Safety warnings surfaced above the output panels for risky GlideRecord configurations.
    // `bannerOnly` warnings only ever show in the banner; the rest ALSO get prepended as
    // `// (WARNING: ...` comments into the generated code (see regen() below).
    // vm.lintWarningsList (computed once per regen(), NOT vm.lintWarnings() called directly from
    // the template) is what the ng-repeat binds to - a function called from ng-repeat="w in
    // expr()" is re-invoked every digest and returns brand-new objects each time, which never
    // settles to a stable collection and trips $rootScope:infdig (confirmed by hitting exactly
    // that error while wiring this up) - same class of bug as the isolate-scope `=` binding
    // memoization notes elsewhere in this app, just triggered via ng-repeat instead.
    var PROTECTED_FIELDS = ['sys_id', 'number', 'sys_created_by', 'sys_created_on', 'sys_updated_by', 'sys_updated_on'];
    vm.lintWarningsList = [];
    function computeLintWarnings() {
      var w = [];
      var s = vm.state;
      var t = s.table || 'the table';
      var op = s.operation;
      var ma = s.multiAction || 'return';
      if (op === 'deleteMultiple' && ma === 'bulk') {
        w.push({ level: 'danger', bannerOnly: true, msg: 'deleteMultiple() will DELETE EVERY record in ' + t + ' if the encodedQuery parameter is empty.' });
      } else if (op === 'deleteMultiple' && ma === 'loop' && !s.useLimit) {
        w.push({ level: 'danger', bannerOnly: true, msg: 'This loop has no limit - if the encodedQuery parameter is empty it will delete EVERY record in ' + t + '.' });
      } else if (op === 'updateMultiple' && ma === 'bulk') {
        w.push({ level: 'danger', bannerOnly: true, msg: 'updateMultiple() will UPDATE EVERY record in ' + t + ' if the encodedQuery parameter is empty.' });
      } else if (op === 'updateMultiple' && ma === 'loop' && !s.useLimit) {
        w.push({ level: 'danger', bannerOnly: true, msg: 'If the encodedQuery parameter is empty, this loop will update EVERY record in ' + t + '.' });
      } else if (op === 'queryReturn' && !s.useLimit && !s.useChooseWindow) {
        // stdId/stdTitle: renders a "Standard: <title>" deep link into the hosted Standards
        // document (see vm.openStandard / the lint template) - only set where a section genuinely
        // covers the warning, not on every entry. stdTitle is the button's own label (not just an
        // id) since the lint template renders one shared button for whichever entry has a stdId.
        w.push({ level: 'warn', stdId: 'let-the-database-do-the-work', stdTitle: 'Let the database do the work', msg: 'Without a limit, an empty encodedQuery parameter will read the entire ' + t + ' table.' });
      }
      var opsWithSets = ['insert', 'updateSingle', 'updateMultiple'];
      if (opsWithSets.indexOf(op) !== -1) {
        var badFields = s.sets.map(function (x) { return (x.field || '').trim(); }).filter(function (f) { return PROTECTED_FIELDS.indexOf(f) !== -1; });
        if (badFields.length) {
          w.push({ level: 'danger', msg: 'Setting ' + badFields.join(', ') + ' directly is not supported - these fields are managed by ServiceNow.' });
        }
      }
      if (s.setWorkflow) {
        w.push({ level: 'warn', msg: 'setWorkflow(false) bypasses business rules and workflows - intended for background jobs or data migrations only.' });
      }
      if (s.autoSysFields) {
        w.push({ level: 'warn', msg: 'autoSysFields(false) prevents updating sys_updated_by and sys_updated_on - intended for data migrations only.' });
      }
      if (op === 'queryReturn' && s.useChooseWindow && !s.orderBys.some(function (o) { return (o.field || '').trim(); })) {
        w.push({ level: 'warn', msg: 'chooseWindow() needs an orderBy, or the paged window is not stable across calls.' });
      }
      return w;
    };

    function updateSubActionOptions() {
      var op = vm.state.operation;
      var opts;
      if (op === 'updateMultiple') {
        opts = [{ value: 'bulk', label: 'Bulk - updateMultiple()' }, { value: 'loop', label: 'Loop - update each record' }];
      } else if (op === 'deleteMultiple') {
        opts = [{ value: 'bulk', label: 'Bulk - deleteMultiple()' }, { value: 'loop', label: 'Loop - delete each record' }];
      } else {
        opts = [];
      }
      // Mutate the SAME array in place (never reassign vm.multiActionOptions) - this now feeds a
      // <gs-select gs-options="vm.multiActionOptions">, whose isolate `=` binding dirty-checks by
      // reference; updateVisibility() (which calls this) runs on every state-watch digest, so a
      // fresh array every call would trip the same $rootScope:infdig bug documented elsewhere in
      // this app (see vm.fieldNames/EncoderService.opsForField's memoization comments).
      vm.multiActionOptions.length = 0;
      opts.forEach(function (o) { vm.multiActionOptions.push(o); });
      if (opts.length && !opts.some(function (o) { return o.value === vm.state.multiAction; })) {
        vm.state.multiAction = opts[0].value;
      }
    }

    function updateVisibility() {
      var op = vm.state.operation;
      var ma = vm.state.multiAction || 'return';
      var gm = vm.state.getMethod || 'sysId';

      vm.vis.getMethod = op === 'get';
      vm.vis.multiAction = op === 'updateMultiple' || op === 'deleteMultiple';
      if (vm.vis.multiAction) { updateSubActionOptions(); }

      vm.vis.order = op === 'queryReturn' || (op === 'updateMultiple' && ma === 'loop') || (op === 'deleteMultiple' && ma === 'loop');
      vm.vis.chooseWindow = op === 'queryReturn';
      vm.vis.autoSysFields = op === 'insert' || op === 'updateSingle' || op === 'updateMultiple';
      vm.vis.withRefs = op === 'insert' || op === 'updateSingle' || (op === 'updateMultiple' && ma === 'loop');

      // "Example inputs" card visibility - these never affect genGlideRecord's output, only the
      // illustrative example-call panel (see ExampleCallService).
      vm.vis.exampleQuery = (op === 'get' && gm === 'encodedQuery') || op === 'queryReturn' || op === 'updateMultiple' || op === 'deleteMultiple';
      var showExampleFields = op === 'insert' || op === 'updateSingle' || op === 'updateMultiple';
      var takesExampleSysId = (op === 'get' && gm === 'sysId') || op === 'updateSingle' || op === 'deleteSingle';
      vm.vis.exampleSysId = takesExampleSysId;
      vm.vis.exampleSets = showExampleFields;
      vm.vis.exampleCard = showExampleFields || takesExampleSysId;

      var pre = 'Parameters replace hardcoded values - the caller passes ';
      if (op === 'insert') { vm.fnHint = pre + 'the field values (fields) at runtime.'; }
      else if (op === 'updateSingle') { vm.fnHint = pre + "the record's sys_id and the field values (fields) at runtime."; }
      else if (op === 'deleteSingle' || (op === 'get' && gm === 'sysId')) { vm.fnHint = pre + "the record's sys_id at runtime."; }
      else { vm.fnHint = pre + 'an encodedQuery string at runtime.'; }
    }

    vm.rawCode = '';
    vm.generatedCode = '';

    function regen() {
      if (vm.state.varNameAuto) { vm.state.varName = CodegenService.deriveVar(vm.state.table, 'Gr', tableLabels); }
      updateVisibility();
      if (vm.state.fnNameAuto) { vm.state.fnName = CodegenService.deriveFnName(vm.state, tableLabels); }
      if (vm.state.fnParamsAuto) { vm.state.fnParams = CodegenService.deriveFnParams(vm.state); }

      var warnings = computeLintWarnings();
      vm.lintWarningsList.length = 0;
      warnings.forEach(function (w) { vm.lintWarningsList.push(w); });

      var body = CodegenService.genGlideRecord(vm.state);
      var withErr = vm.errorHandling ? CodegenService.wrapTryCatch(body, vm.state.table || 'table') : body;
      var danger = warnings.filter(function (w) { return w.level === 'danger' && !w.bannerOnly; });
      if (danger.length) {
        withErr = danger.map(function (w) { return '// ⚠ WARNING: ' + w.msg; }).join('\n') + '\n' + withErr;
      }
      vm.rawCode = CodegenService.wrapInFn(vm.state.fnName, vm.state.fnParams, withErr);
      vm.generatedCode = $sce.trustAsHtml(CodegenService.highlight(vm.rawCode));

      vm.exampleCode = ExampleCallService.buildExampleCall(vm.state, tableLabels);
      vm.exampleHtml = $sce.trustAsHtml(CodegenService.highlight(vm.exampleCode));
      vm.exampleHasHardcodedSysId = ExampleCallService.exampleHasHardcodedSysId(vm.state);
    }

    vm.onTableChange = function () {
      if (!vm.state.table) { vm.state.table = ''; }
      vm.ensureFieldsLoaded(vm.state.table);
      regen();
    };
    vm.onVarNameEdit = function () { vm.state.varNameAuto = false; regen(); };
    vm.onFnNameEdit = function () { vm.state.fnNameAuto = false; regen(); };
    vm.onFnParamsEdit = function () { vm.state.fnParamsAuto = false; regen(); };
    vm.onFieldChange = regen;
    // setLimit() and chooseWindow() conflict - pick one, not both.
    vm.onUseLimitChange = function () {
      if (vm.state.useLimit && vm.state.useChooseWindow) { vm.state.useChooseWindow = false; }
      regen();
    };
    vm.onUseChooseWindowChange = function () {
      if (vm.state.useChooseWindow && vm.state.useLimit) { vm.state.useLimit = false; }
      regen();
    };

    vm.addOrder = function () { vm.state.orderBys.push({ field: '', dir: 'asc' }); regen(); };
    vm.removeOrder = function (i) { vm.state.orderBys.splice(i, 1); regen(); };
    vm.addSet = function () { vm.state.sets.push({ field: '', value: '' }); regen(); };
    vm.removeSet = function (i) { vm.state.sets.splice(i, 1); regen(); };

    // Any field in vm.state can move the generated code (operation, table, checkboxes, order
    // rows...) - watching the whole object (deep) keeps this simple and correct; this form's
    // field count is small enough that deep-watching it has no perceptible cost.
    $scope.$watch(function () { return vm.state; }, regen, true);
    regen();

    /* ============================= GlideQuery mode ============================= */
    // A separate mode from GlideRecord, not a checkbox on it - GlideQuery is a genuinely different
    // programming model (immutable fluent chain vs. mutable imperative object; see
    // GlideQueryService's own header comment). Its Example Inputs card is illustrative only, exactly
    // like GlideRecord's - the real generated function is parameterized, never literal. Own state
    // object, per the same "each mode ports independently" rule as every other mode here.
    vm.gqOperations = [
      { value: 'get', label: 'Get a record' },
      { value: 'queryReturn', label: 'Get multiple records' },
      { value: 'count', label: 'Count records' },
      { value: 'insert', label: 'Insert a record' },
      { value: 'update', label: 'Update matching records' },
      { value: 'deleteMultiple', label: 'Delete matching records' },
    ];
    vm.gqState = {
      table: 'incident',
      gqVar: 'incidentGq',
      gqVarAuto: true,
      operation: 'get',
      getMethod: 'sysId',
      fnName: 'getIncident',
      fnParams: 'sysId',
      fnNameAuto: true,
      fnParamsAuto: true,
      selectFields: [],
      useLimit: true,
      limit: 10,
      orderBys: [],
      // "Example inputs" - illustrative only, never affect genGlideQuery's output (see
      // ExampleCallService.buildGqExampleCall) - same split as GlideRecord's grArgGroups/
      // exampleQuery/exampleSysId/sets.
      gqArgGroups: [{ conds: [{ field: '', op: '=', value: '' }] }],
      exampleQuery: '',
      exampleSysId: '',
      sets: [],
    };
    vm.gqVis = {};
    vm.gqFnHint = '';
    vm.gqLintWarningsList = [];
    function computeGqLintWarnings() {
      var w = [];
      var s = vm.gqState;
      var t = s.table || 'the table';
      var op = s.operation;
      // Unconditional, matching GlideRecord's own bulk deleteMultiple/updateMultiple warnings above
      // - these fire regardless of the illustrative example, since the real risk is what a CALLER
      // might pass to the generated function's encodedQuery parameter, not this form's own state.
      if (op === 'deleteMultiple') {
        w.push({ level: 'danger', bannerOnly: true, msg: 'deleteMultiple() will DELETE EVERY matching record in ' + t + ' if the encodedQuery parameter is empty.' });
      } else if (op === 'update') {
        w.push({ level: 'danger', bannerOnly: true, msg: 'update() will UPDATE EVERY matching record in ' + t + ' if the encodedQuery parameter is empty.' });
      } else if (op === 'queryReturn' && !s.useLimit) {
        w.push({ level: 'warn', stdId: 'let-the-database-do-the-work', stdTitle: 'Let the database do the work', msg: 'Without a limit, an empty encodedQuery parameter will read the entire ' + t + ' table.' });
      }
      if (op === 'insert' || op === 'update') {
        var badFields = s.sets.map(function (x) { return (x.field || '').trim(); }).filter(function (f) { return PROTECTED_FIELDS.indexOf(f) !== -1; });
        if (badFields.length) {
          w.push({ level: 'danger', msg: 'Setting ' + badFields.join(', ') + ' directly is not supported - these fields are managed by ServiceNow.' });
        }
      }
      return w;
    }

    function updateGqVisibility() {
      var op = vm.gqState.operation;
      var gm = vm.gqState.getMethod || 'sysId';

      vm.gqVis.getMethod = op === 'get';
      vm.gqVis.selectFields = op === 'get' || op === 'queryReturn';
      vm.gqVis.order = op === 'queryReturn';

      // "Example inputs" card visibility - these never affect genGlideQuery's output, only the
      // illustrative example-call panel (see ExampleCallService.buildGqExampleCall).
      vm.gqVis.exampleQuery = (op === 'get' && gm === 'encodedQuery') ||
        ['queryReturn', 'count', 'update', 'deleteMultiple'].indexOf(op) !== -1;
      var showExampleFields = op === 'insert';
      var takesExampleSysId = op === 'get' && gm === 'sysId';
      vm.gqVis.exampleSysId = takesExampleSysId;
      vm.gqVis.exampleSets = showExampleFields;
      vm.gqVis.exampleCard = showExampleFields || takesExampleSysId;

      var pre = 'Parameters replace hardcoded values - the caller passes ';
      if (op === 'insert') { vm.gqFnHint = pre + 'the field values (fields) at runtime.'; }
      else if (op === 'update') { vm.gqFnHint = pre + 'an encodedQuery string and the field values (fields) at runtime.'; }
      else if (op === 'get' && gm === 'sysId') { vm.gqFnHint = pre + "the record's sys_id at runtime."; }
      else { vm.gqFnHint = pre + 'an encodedQuery string at runtime.'; }
    }

    vm.gqRawCode = '';
    vm.gqGeneratedCode = '';

    function regenGq() {
      if (vm.gqState.gqVarAuto) { vm.gqState.gqVar = CodegenService.deriveVar(vm.gqState.table, 'Gq', tableLabels); }
      updateGqVisibility();
      if (vm.gqState.fnNameAuto) { vm.gqState.fnName = GlideQueryService.deriveGqFnName(vm.gqState, tableLabels); }
      if (vm.gqState.fnParamsAuto) { vm.gqState.fnParams = GlideQueryService.deriveGqFnParams(vm.gqState); }

      var warnings = computeGqLintWarnings();
      vm.gqLintWarningsList.length = 0;
      warnings.forEach(function (w) { vm.gqLintWarningsList.push(w); });

      var body = GlideQueryService.genGlideQuery(vm.gqState);
      var withErr = vm.errorHandling ? CodegenService.wrapTryCatch(body, vm.gqState.table || 'table') : body;
      var danger = warnings.filter(function (w) { return w.level === 'danger' && !w.bannerOnly; });
      if (danger.length) {
        withErr = danger.map(function (w) { return '// ⚠ WARNING: ' + w.msg; }).join('\n') + '\n' + withErr;
      }
      vm.gqRawCode = CodegenService.wrapInFn(vm.gqState.fnName, vm.gqState.fnParams, withErr);
      vm.gqGeneratedCode = $sce.trustAsHtml(CodegenService.highlight(vm.gqRawCode));

      vm.gqExampleCode = ExampleCallService.buildGqExampleCall(vm.gqState, tableLabels);
      vm.gqExampleHtml = $sce.trustAsHtml(CodegenService.highlight(vm.gqExampleCode));
      vm.gqExampleHasHardcodedSysId = ExampleCallService.gqExampleHasHardcodedSysId(vm.gqState);
    }

    vm.onGqTableChange = function () { vm.ensureFieldsLoaded(vm.gqState.table); regenGq(); };
    vm.onGqVarEdit = function () { vm.gqState.gqVarAuto = false; regenGq(); };
    vm.onGqFnNameEdit = function () { vm.gqState.fnNameAuto = false; regenGq(); };
    vm.onGqFnParamsEdit = function () { vm.gqState.fnParamsAuto = false; regenGq(); };
    vm.onGqFieldChange = regenGq;
    vm.onGqUseLimitChange = regenGq;

    vm.addGqField = function () { vm.gqState.selectFields.push(''); regenGq(); };
    vm.removeGqField = function (i) { vm.gqState.selectFields.splice(i, 1); regenGq(); };
    vm.addGqOrder = function () { vm.gqState.orderBys.push({ field: '', dir: 'asc' }); regenGq(); };
    vm.removeGqOrder = function (i) { vm.gqState.orderBys.splice(i, 1); regenGq(); };
    vm.addGqSet = function () { vm.gqState.sets.push({ field: '', value: '' }); regenGq(); };
    vm.removeGqSet = function (i) { vm.gqState.sets.splice(i, 1); regenGq(); };

    $scope.$watch(function () { return vm.gqState; }, regenGq, true);
    regenGq();

    /* ============================= GlideAggregate mode ============================= */
    // Kept as its own state object rather than unifying with vm.state's `table` - the original
    // shares one `state.table` across every mode; independent per-mode state is a deliberate
    // simplification for this phase (each mode ports and verifies on its own) and can be
    // unified later without touching either mode's codegen.
    vm.aggState = {
      table: 'incident',
      aggVar: 'incidentGa',
      aggVarAuto: true,
      fnName: 'getIncidentCount',
      fnParams: 'encodedQuery',
      fnNameAuto: true,
      fnParamsAuto: true,
      aggregates: [{ fn: 'COUNT', field: '' }],
      groupBys: [],
      havings: [],
      // "Example inputs" - illustrative only (see ExampleCallService.buildAggExampleCall).
      // NOT the same as groupBys above - `groups` here is condition-builder state for the
      // example call's encodedQuery, matching the original's separately-named state.groups.
      groups: [{ conds: [{ field: '', op: '=', value: '' }] }],
      gaExampleQuery: '',
    };
    vm.aggFns = AggregateService.AGG_FNS;
    // {value,label} versions of the above for gs-select, which needs objects to correctly treat
    // these as closed enums (no free-text "+ Use ..." entry) - a.fn/h.fn/h.op still store the
    // plain string value AggregateService/genGlideAggregate expect; only the option LIST changes
    // shape for gs-select's benefit, not the codegen-facing data.
    vm.aggFnOptions = vm.aggFns.map(function (f) { return { value: f, label: f }; });
    vm.isAggFieldExcluded = function (fn, table, name) { return AggregateService.aggFieldExcluded(fn, table, name); };
    vm.havingOps = ['>', '<', '>=', '<=', '=', '!='];
    vm.havingOpOptions = vm.havingOps.map(function (o) { return { value: o, label: o }; });
    vm.groupOrders = [
      { value: 'none', label: 'No ordering' },
      { value: 'asc', label: 'Order ascending' },
      { value: 'desc', label: 'Order descending' },
    ];

    vm.aggRawCode = '';
    vm.aggGeneratedCode = '';

    function regenAgg() {
      if (vm.aggState.aggVarAuto) { vm.aggState.aggVar = CodegenService.deriveVar(vm.aggState.table, 'Ga', tableLabels); }
      if (vm.aggState.fnNameAuto) { vm.aggState.fnName = AggregateService.deriveAggFnName(vm.aggState, tableLabels); }
      if (vm.aggState.fnParamsAuto) { vm.aggState.fnParams = AggregateService.deriveAggFnParams(); }

      var body = AggregateService.genGlideAggregate(vm.aggState);
      var withErr = vm.errorHandling ? CodegenService.wrapTryCatch(body, vm.aggState.table || 'table') : body;
      vm.aggRawCode = CodegenService.wrapInFn(vm.aggState.fnName, vm.aggState.fnParams, withErr);
      vm.aggGeneratedCode = $sce.trustAsHtml(CodegenService.highlight(vm.aggRawCode));

      vm.aggExampleCode = ExampleCallService.buildAggExampleCall(vm.aggState, tableLabels);
      vm.aggExampleHtml = $sce.trustAsHtml(CodegenService.highlight(vm.aggExampleCode));
    }

    vm.onAggTableChange = function () { vm.ensureFieldsLoaded(vm.aggState.table); regenAgg(); };
    vm.onAggVarEdit = function () { vm.aggState.aggVarAuto = false; regenAgg(); };
    vm.onAggFnNameEdit = function () { vm.aggState.fnNameAuto = false; regenAgg(); };
    vm.onAggFnParamsEdit = function () { vm.aggState.fnParamsAuto = false; regenAgg(); };
    vm.onAggFieldChange = regenAgg;

    vm.addAggregate = function () { vm.aggState.aggregates.push({ fn: 'COUNT', field: '' }); regenAgg(); };
    vm.removeAggregate = function (i) { vm.aggState.aggregates.splice(i, 1); regenAgg(); };
    vm.addGroupBy = function () { vm.aggState.groupBys.push({ field: '', order: 'none' }); regenAgg(); };
    vm.removeGroupBy = function (i) { vm.aggState.groupBys.splice(i, 1); regenAgg(); };
    vm.addHaving = function () { vm.aggState.havings.push({ fn: 'COUNT', op: '>', value: '' }); regenAgg(); };
    vm.removeHaving = function (i) { vm.aggState.havings.splice(i, 1); regenAgg(); };

    $scope.$watch(function () { return vm.aggState; }, regenAgg, true);
    regenAgg();

    /* ============================= GlideAjax mode ============================= */
    // ajaxScriptInclude is a plain editable field here (no table-derived auto-default) - in the
    // original it auto-derives from the shared state.table via deriveClass(), but that link only
    // existed because table was shared across every mode; this mode has no table concept, so the
    // Call Setup card's own Script Include field is simply the source of truth.
    vm.ajaxState = {
      ajaxVar: 'incidentServiceAjax',
      ajaxVarAuto: true,
      ajaxScriptInclude: 'IncidentService',
      ajaxMethod: 'getIncident',
      ajaxParams: [{ name: 'sys_id', value: 'sysId' }],
      fnName: 'getIncident',
      fnNameAuto: true,
      fnParams: 'sysId, callback',
      fnParamsAuto: true,
    };
    vm.ajaxRawCode = '';
    vm.ajaxGeneratedCode = '';

    function regenAjax() {
      // AjaxService reads errorHandling off the state object it's handed, so mirror the shared
      // flag onto it each regen rather than changing that service's signature.
      vm.ajaxState.errorHandling = vm.errorHandling;
      if (vm.ajaxState.ajaxVarAuto) { vm.ajaxState.ajaxVar = AjaxService.deriveAjaxVar(vm.ajaxState.ajaxScriptInclude); }
      if (vm.ajaxState.fnNameAuto) { vm.ajaxState.fnName = AjaxService.deriveAjaxFnName(vm.ajaxState.ajaxMethod); }
      if (vm.ajaxState.fnParamsAuto) { vm.ajaxState.fnParams = AjaxService.deriveAjaxFnParams(); }

      // Error handling is baked inside genGlideAjax itself (see AjaxService) - no outer
      // wrapTryCatch call here, unlike GlideRecord/GlideAggregate.
      var body = AjaxService.genGlideAjax(vm.ajaxState);
      vm.ajaxRawCode = CodegenService.wrapInFn(vm.ajaxState.fnName, vm.ajaxState.fnParams, body);
      vm.ajaxGeneratedCode = $sce.trustAsHtml(CodegenService.highlight(vm.ajaxRawCode));

      vm.ajaxExampleCode = ExampleCallService.buildAjaxExampleCall(vm.ajaxState, vm.state.table);
      vm.ajaxExampleHtml = $sce.trustAsHtml(CodegenService.highlight(vm.ajaxExampleCode));
    }

    // Editing the Script Include name / Method does NOT disable ajaxVarAuto/fnNameAuto - those
    // derived fields keep tracking (regenAjax's own `if (...Auto)` checks handle that). Only
    // editing the derived field itself (ajaxVar, fnName) takes it out of auto mode.
    vm.onAjaxSIEdit = regenAjax;
    vm.onAjaxVarEdit = function () { vm.ajaxState.ajaxVarAuto = false; regenAjax(); };
    vm.onAjaxMethodEdit = regenAjax;
    vm.onAjaxFnNameEdit = function () { vm.ajaxState.fnNameAuto = false; regenAjax(); };
    vm.onAjaxFnParamsEdit = function () { vm.ajaxState.fnParamsAuto = false; regenAjax(); };
    vm.onAjaxFieldChange = regenAjax;

    vm.addAjaxParam = function () { vm.ajaxState.ajaxParams.push({ name: '', value: '' }); regenAjax(); };
    vm.removeAjaxParam = function (i) { vm.ajaxState.ajaxParams.splice(i, 1); regenAjax(); };

    $scope.$watch(function () { return vm.ajaxState; }, regenAjax, true);
    regenAjax();

    /* ============================= Encoded Query mode ============================= */
    // Condition group add/remove/OR/AND structure is handled by the <gs-condition-groups>
    // directive now (see its own file) - this mode just owns the data and regenerates on change.
    // Encoder's own table (it drives the field/reference pickers only, not any generated code) -
    // per-page like every other mode's table, so it persists across visits and never syncs to them.
    vm.encTable = 'incident';
    vm.encGroups = [{ conds: [{ field: '', op: '=', value: '' }] }];
    vm.encRawCode = '';
    vm.encGeneratedCode = '';

    function regenEnc() {
      vm.encRawCode = EncoderService.genEncoder(vm.encGroups);
      vm.encGeneratedCode = $sce.trustAsHtml(CodegenService.highlight(vm.encRawCode));
    }
    vm.onEncFieldChange = regenEnc;

    $scope.$watch(function () { return vm.encGroups; }, regenEnc, true);
    regenEnc();

    /* ============================= Script Include mode ============================= */
    // A dedicated, configurable CRUD form: each operation is a checkbox, ON by default - this form
    // hands back a complete, working class immediately, since that's the whole point of a
    // toggle-driven CRUD form. Each method carries its OWN inline options object, shown only when
    // that method is on and scoped to just what's relevant to it (setWorkflow/autoSysFields mirror
    // GlideRecord mode's own per-operation relevance rules - see codegen.service.js's
    // genGlideRecord) - not one pooled options set applied uniformly to every method. `callable`
    // switches the generated output between server-only, client-callable (AbstractAjaxProcessor),
    // or both (see ScriptIncludeService's header comment).
    vm.siState = {
      table: 'incident',
      className: 'IncidentService',
      classNameAuto: true,
      varName: 'incidentGr',
      varNameAuto: true,
      // clientCallable/alsoServerClass are the two UI toggles; `callable` (read by
      // ScriptIncludeService/ExampleCallService as 'server'/'ajax'/'both') is derived from them
      // each regen below rather than being its own bound control - a single "client-callable" on/
      // off switch, with "also build a server class" only meaningful (and only shown) once that's
      // on, matches how this looked before the earlier three-way dropdown redesign.
      clientCallable: false,
      alsoServerClass: false,
      jsdoc: false,
      methods: {
        create: { on: true, setWorkflow: false, autoSysFields: false, returnType: 'sysid', fields: [] },
        read: { on: true, returnType: 'gliderecord', fields: [] },
        list: { on: true, returnType: 'gliderecord', fields: [], limit: '' },
        update: { on: true, setWorkflow: false, autoSysFields: false, returnType: 'sysid', fields: [] },
        delete: { on: true, setWorkflow: false },
      },
    };
    vm.siReturnTypeOptions = [
      { value: 'gliderecord', label: 'GlideRecord object' },
      { value: 'object', label: 'Plain object (field values only)' },
    ];
    vm.siListReturnTypeOptions = vm.siReturnTypeOptions.concat([{ value: 'sysids', label: 'Array of sys_ids' }]);
    vm.siWriteReturnTypeOptions = [
      { value: 'sysid', label: 'sys_id (default)' },
      { value: 'gliderecord', label: 'GlideRecord object' },
      { value: 'object', label: 'Plain object (field values only)' },
    ];
    vm.siRawCode = '';
    vm.siGeneratedCode = '';
    vm.siExampleCode = '';
    vm.siExampleHtml = null;

    function regenSi() {
      // ScriptIncludeService reads errorHandling off the state object it's handed, so mirror the
      // shared flag onto it each regen rather than changing that service's signature.
      vm.siState.errorHandling = vm.errorHandling;
      // 'callable' is what ScriptIncludeService/ExampleCallService actually read - derived from
      // the two UI toggles rather than bound directly (see vm.siState's own comment).
      vm.siState.callable = !vm.siState.clientCallable ? 'server' : (vm.siState.alsoServerClass ? 'both' : 'ajax');
      if (vm.siState.classNameAuto) { vm.siState.className = CodegenService.deriveClass(vm.siState.table); }
      if (vm.siState.varNameAuto) { vm.siState.varName = CodegenService.deriveVar(vm.siState.table, 'Gr'); }
      // No wrapInFn - the Script Include's own class body IS the output. Error handling is baked
      // per-method inside ScriptIncludeService, not an outer wrapTryCatch either.
      vm.siRawCode = ScriptIncludeService.genScriptInclude(vm.siState);
      vm.siGeneratedCode = $sce.trustAsHtml(CodegenService.highlight(vm.siRawCode));
      vm.siExampleCode = ExampleCallService.buildSiExampleCall(vm.siState);
      vm.siExampleHtml = vm.siExampleCode ? $sce.trustAsHtml(CodegenService.highlight(vm.siExampleCode)) : null;
    }

    vm.onSiTableChange = function () { vm.ensureFieldsLoaded(vm.siState.table); regenSi(); };
    vm.onSiClassNameEdit = function () { vm.siState.classNameAuto = false; regenSi(); };
    vm.onSiVarNameEdit = function () { vm.siState.varNameAuto = false; regenSi(); };
    vm.onSiFieldChange = regenSi;
    // The "return specific fields only" picker under any method's Returns dropdown - plain string
    // rows (not {field} objects like groupBys) since gs-select can bind straight to
    // fields[$index]; an empty list falls back to ScriptIncludeService's own "no fields -> every
    // field" default, so there's no separate on/off toggle needed here.
    vm.addSiField = function (key) { vm.siState.methods[key].fields.push(''); regenSi(); };
    vm.removeSiField = function (key, i) { vm.siState.methods[key].fields.splice(i, 1); regenSi(); };

    $scope.$watch(function () { return vm.siState; }, regenSi, true);
    regenSi();

    // Keep every mode's cached output current with the shared error-handling flag even when it's
    // flipped while looking at a different mode's panel (each regen* already reads vm.errorHandling
    // fresh, this just makes sure they all re-run when the flag itself changes).
    $scope.$watch(function () { return vm.errorHandling; }, function (nv, ov) {
      if (nv === ov) { return; }
      regen(); regenGq(); regenAgg(); regenAjax(); regenSi();
    });

    /* ============================= Working table (per-page context) ============================= */
    // The header's single table picker (see index.html's "Source" card) is per-page, not shared:
    // each table-scoped mode keeps its OWN table and they no longer follow each other. The picker's
    // vm.workingTable is just the value for whatever page you're on - loaded from that mode's own
    // state when you enter it (see vm.selectMode) and written straight back to only that mode here.
    // The Table concept belongs to the individual builder, not the app (the Standards are what tie
    // the modes together now); GlideAjax, which has no table, correctly shows no picker at all.
    var WORKING_TABLE_MODES = { GlideRecord: true, GlideQuery: true, GlideAggregate: true, ScriptInclude: true, Encoder: true };
    vm.usesWorkingTable = function (mode) { return !!WORKING_TABLE_MODES[mode]; };
    function tableForMode(mode) {
      if (mode === 'GlideRecord') { return vm.state.table; }
      if (mode === 'GlideQuery') { return vm.gqState.table; }
      if (mode === 'GlideAggregate') { return vm.aggState.table; }
      if (mode === 'ScriptInclude') { return vm.siState.table; }
      if (mode === 'Encoder') { return vm.encTable; }
      return '';
    }
    vm.onWorkingTableChange = function () {
      var t = vm.workingTable;
      if (vm.activeMode === 'GlideRecord') { vm.state.table = t; vm.onTableChange(); }
      else if (vm.activeMode === 'GlideQuery') { vm.gqState.table = t; vm.onGqTableChange(); }
      else if (vm.activeMode === 'GlideAggregate') { vm.aggState.table = t; vm.onAggTableChange(); }
      else if (vm.activeMode === 'ScriptInclude') { vm.siState.table = t; vm.onSiTableChange(); }
      else if (vm.activeMode === 'Encoder') { vm.encTable = t; }
    };

    /* ============================= Standards (hosted document) ============================= */
    // The document itself, and the deep-link-scroll/scroll-spy mechanics, live in
    // StandardsUiService - passed straight through (vm.standardsDoc is built once and never
    // reassigned, so this one-time reference copy is safe). vm.stdFocusId/vm.activeStdId stay HERE
    // (read in 11+ template spots as plain properties, not function calls) - the service reports
    // changes back via callback rather than owning them itself (see its own header comment).
    vm.standardsDoc = StandardsUiService.doc;
    // Two views sharing one mounted DOM: 'overview' (the Contents card's chapter hub, doc hidden) vs
    // 'reading' (the doc visible, hub hidden). The chapter-band wrapper (index.html) hides via
    // .std-reading-hidden (position:absolute + visibility:hidden - see app.scss), NOT ng-if and NOT
    // ng-show/display:none either - two reasons: the scroll-spy's IntersectionObserver already
    // snapshotted every <h2 id="std-..."> when Standards mode was entered (see the activeMode $watch
    // below), and ng-if would destroy/recreate those nodes the moment the reader left overview,
    // desyncing it exactly like search already had to avoid (see vm.stdQuery below); AND
    // display:none was tried first and caused a real reproduced bug - the FIRST time ~20000px of
    // never-shown content went display:none -> block, layout took over a second, and the scroll that
    // follows (StandardsUiService.scrollTo, which measures immediately) landed 5+ chapters short
    // because it measured before that layout finished. visibility:hidden keeps the content always
    // genuinely laid out (just positioned out of the way), so that measurement is never stale.
    // Defaults to 'overview' on every
    // fresh entry into Standards (reset alongside stdFocusId/activeStdId/stdQuery in selectMode
    // above) - openStandard is the one place that flips it to 'reading', since every path that lands
    // on a specific chapter/section (a hub tile, a rail link, or an external deep-link) already
    // routes through it.
    vm.stdView = 'overview';
    // Search: filters the rail + reading pane down to matching sections via ng-show (NOT ng-if - see
    // index.html's own comment on the Standards view for why: ng-if would destroy/recreate the <h2>
    // nodes the scroll-spy's IntersectionObserver already snapshotted, permanently desyncing it).
    // Plain per-digest boolean predicates, same class as vm.stdPartHasFocus below - cheap at this
    // doc's size (~40 sections), no memoization needed.
    vm.stdQuery = '';
    vm.stdSectionMatches = function (section) {
      var q = vm.stdQuery.trim().toLowerCase();
      return !q || section.searchText.indexOf(q) !== -1;
    };
    vm.stdPartVisible = function (part) {
      return !vm.stdQuery.trim() || part.sections.some(vm.stdSectionMatches);
    };
    vm.stdGroupVisible = function (grp) {
      return !vm.stdQuery.trim() || grp.parts.some(vm.stdPartVisible);
    };
    vm.stdHasMatches = function () { return vm.standardsDoc.groups.some(vm.stdGroupVisible); };
    vm.clearStdSearch = function () { vm.stdQuery = ''; };
    // Focus mode: arriving fresh from another mode (not already browsing Standards) spotlights JUST
    // the target section - every other section/lead/Contents-intro/rail-link dims (see .std-dimmed)
    // and goes inert (pointer-events: none, both per-dimmed-element and wholesale on the rail via
    // .std-rail-locked so even the one undimmed/active rail link can't be clicked), and .builder
    // itself locks scrolling (.builder-focus-lock - see its own CSS comment). This is a genuine
    // decision point, not just a passive highlight: the reader can't scroll away or pick a different
    // section until they explicitly choose one of the two header buttons - "Back to X"
    // (vm.backFromStandards, leaves Standards entirely) or "Stay & browse" (vm.exitStdFocus, clears
    // the lock and stays right here). Both read `vm.stdFocusId` alone to decide what's shown/locked,
    // so clearing it in exitStdFocus is the ONE state change that simultaneously un-dims everything,
    // unlocks the rail, and restores scrolling.
    vm.stdFocusId = null;
    vm.stdPartHasFocus = function (part) {
      if (!vm.stdFocusId) { return true; }
      return part.sections.some(function (s) { return s.id === vm.stdFocusId; });
    };
    vm.exitStdFocus = function () { vm.stdFocusId = null; };
    // The chapter BUTTON's own highlight - exact id match only (the chapter heading itself, not any
    // section under it). Once the reader has drilled into a specific section, that section carries
    // its own highlight (.std-rail-section.active in index.html) instead.
    vm.stdPartHeadingActive = function (part) { return vm.activeStdId === part.id; };
    // Per-chapter expand/collapse for the rail's section sub-list - purely manual, keyed by part.id
    // (plain object, not part of vm.standardsDoc - this is rail UI state, not doc data). The ONLY
    // way this changes is vm.toggleStdExpand, wired to the chevron alone (index.html) - earlier
    // versions also auto-expanded a chapter while it was the active one or a search was running,
    // but that meant clicking a chapter's own name (which sets it active) silently expanded it too,
    // and its chevron couldn't collapse it back (active status kept re-forcing it open every
    // digest) - reported directly as "I open a chapter, I can't close it." Navigating to a chapter
    // or section, or typing a search, no longer touches this map at all.
    vm.stdExpanded = {};
    vm.stdPartExpanded = function (part) { return !!vm.stdExpanded[part.id]; };
    vm.toggleStdExpand = function (part, $event) {
      if ($event) { $event.stopPropagation(); }
      vm.stdExpanded[part.id] = !vm.stdExpanded[part.id];
    };
    // Deep link from anywhere: the std-link tips scattered through the builder modes call this with
    // a section/subsection slug (see StandardsService's anchor ids).
    vm.openStandard = function (id) {
      var enteringFresh = vm.activeMode !== 'Standards';
      vm.selectMode('Standards');
      if (!enteringFresh) { vm.stdFocusId = null; }
      vm.stdView = 'reading';
      // Highlight the picked section in the rail immediately; StandardsUiService.scrollTo suppresses
      // the scroll-spy through the scroll so it can't snap the highlight elsewhere before landing.
      vm.activeStdId = id;
      StandardsUiService.scrollTo(id, enteringFresh, function (focusId) { vm.stdFocusId = focusId; });
    };
    // Rail's pinned "Overview" item - the reciprocal of openStandard: hides the doc, shows the hub,
    // and drops any lingering rail highlight/focus lock from whatever chapter was being read.
    vm.showStdOverview = function () {
      vm.stdView = 'overview';
      vm.activeStdId = null;
      vm.stdFocusId = null;
      StandardsUiService.scrollToTop();
    };
    // The reciprocal of openStandard: the "Build this in <mode>" buttons inside the Standards
    // document jump the reader to the matching builder. Just navigates for now (pre-seeding the
    // builder to reproduce the exact example is a deliberate later step, not v1).
    vm.openBuilder = function (modeKey) {
      if (modeKey) { vm.selectMode(modeKey); }
    };
    // The Standards doc renders as trusted HTML blobs (ng-bind-html), and ng-click is NOT compiled
    // inside injected HTML - so the doc's `<button class="std-build" data-build="...">` can't carry
    // their own handler. One delegated ng-click on the Standards wrapper catches every one of them.
    vm.onStandardsClick = function ($event) {
      var btn = $event.target.closest ? $event.target.closest('[data-build]') : null;
      if (btn) { vm.openBuilder(btn.getAttribute('data-build')); }
    };
    vm.activeStdId = null;
    $scope.$watch('vm.activeMode', function (mode) {
      if (mode === 'Standards') {
        // Guarded on vm.stdView === 'reading': the observer watches every h2 in the doc, and those
        // headings stay genuinely laid out (not display:none) even while Overview is showing - see
        // .std-band's .std-reading-hidden class and .std-doc-main's overflow:hidden in app.scss for
        // why. That's necessary so scrollTo's getBoundingClientRect() is never stale the instant a
        // tile is clicked, but it also means the observer can still see those headings intersect
        // and would otherwise light up a chapter in the rail right alongside "Overview" the moment
        // the reader scrolls at all - this stops it from writing anywhere except while actually
        // reading.
        StandardsUiService.setupScrollSpy(function (id) { if (vm.stdView === 'reading') { vm.activeStdId = id; } });
      } else {
        StandardsUiService.teardownScrollSpy();
      }
    });

    /* ============================= Shared output pane ============================= */
    // The original has a single output pane whose content follows the active mode - same here,
    // switched by activeMode rather than each mode owning its own visible pane. The Encoder
    // mode's pane is also titled differently ("Generated Query" vs "Generated Script"), matching
    // the original's outTitle swap.
    vm.outputTitle = function () { return vm.activeMode === 'Encoder' ? 'Generated Query' : 'Generated Script'; };
    var PANEL_TITLES = { GlideRecord: 'GlideRecord', GlideQuery: 'GlideQuery', GlideAggregate: 'GlideAggregate', GlideAjax: 'GlideAjax', ScriptInclude: 'Script Include', Encoder: 'Encoded Query' };
    vm.mainPanelTitle = function () { return PANEL_TITLES[vm.activeMode] || (vm.activeModeInfo() ? vm.activeModeInfo().name : ''); };
    vm.currentRawCode = function () {
      if (vm.activeMode === 'GlideRecord') { return vm.rawCode; }
      if (vm.activeMode === 'GlideQuery') { return vm.gqRawCode; }
      if (vm.activeMode === 'GlideAggregate') { return vm.aggRawCode; }
      if (vm.activeMode === 'GlideAjax') { return vm.ajaxRawCode; }
      if (vm.activeMode === 'ScriptInclude') { return vm.siRawCode; }
      if (vm.activeMode === 'Encoder') { return vm.encRawCode; }
      return '';
    };
    vm.currentHtml = function () {
      if (vm.activeMode === 'GlideRecord') { return vm.generatedCode; }
      if (vm.activeMode === 'GlideQuery') { return vm.gqGeneratedCode; }
      if (vm.activeMode === 'GlideAggregate') { return vm.aggGeneratedCode; }
      if (vm.activeMode === 'GlideAjax') { return vm.ajaxGeneratedCode; }
      if (vm.activeMode === 'ScriptInclude') { return vm.siGeneratedCode; }
      if (vm.activeMode === 'Encoder') { return vm.encGeneratedCode; }
      return $sce.trustAsHtml('<span class="c-com">// Phase 2 - ' + (vm.activeModeInfo() ? vm.activeModeInfo().name : '') + ' codegen not yet ported.</span>');
    };
    vm.copyStatus = 'Copy';
    vm.copyCode = function () {
      var code = vm.currentRawCode();
      if (!code || !navigator.clipboard || !navigator.clipboard.writeText) { return; }
      navigator.clipboard.writeText(code).then(function () {
        $scope.$applyAsync(function () {
          vm.copyStatus = 'Copied ✓';
          setTimeout(function () { $scope.$applyAsync(function () { vm.copyStatus = 'Copy'; }); }, 1300);
        });
      });
    };
    // A Blob + object URL saved as the panel's title-appropriate filename. mime defaults to the
    // code panels' own (always .js); the Deploy modal's per-tab downloads (xml/html/css/js) pass
    // their own.
    function downloadText(text, filename, mime) {
      if (!text) { return; }
      var blob = new Blob([text], { type: mime || 'text/javascript' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    vm.currentFilename = function () {
      var table = vm.state.table || 'script';
      if (vm.activeMode === 'GlideRecord') { return 'gliderecord_' + table + '.js'; }
      if (vm.activeMode === 'GlideQuery') { return 'glidequery_' + (vm.gqState.table || 'script') + '.js'; }
      if (vm.activeMode === 'GlideAggregate') { return 'glideaggregate_' + (vm.aggState.table || 'script') + '.js'; }
      if (vm.activeMode === 'GlideAjax') { return 'glideajax_' + CodegenService.camel(vm.ajaxState.ajaxScriptInclude || 'call') + '.js'; }
      if (vm.activeMode === 'ScriptInclude') { return (vm.siState.className || 'ScriptInclude') + '.js'; }
      if (vm.activeMode === 'Encoder') { return 'encoded_query.js'; }
      return 'script.js';
    };
    vm.downloadCode = function () { downloadText(vm.currentRawCode(), vm.currentFilename()); };
    vm.downloadExampleCode = function () {
      var table = vm.activeMode === 'GlideQuery' ? (vm.gqState.table || 'script') :
        vm.activeMode === 'GlideAggregate' ? (vm.aggState.table || 'script') :
        vm.activeMode === 'ScriptInclude' ? (vm.siState.table || 'script') : (vm.state.table || 'script');
      downloadText(vm.currentExampleCode(), 'example_call_' + table + '.js');
    };

    // Second "Example call" panel - only GlideRecord/GlideQuery/GlideAggregate/GlideAjax/
    // ScriptInclude have one; ''/null means the panel is hidden for the current mode (either not
    // applicable, or no example configured for this operation/state).
    vm.currentExampleCode = function () {
      if (vm.activeMode === 'GlideRecord') { return vm.exampleCode; }
      if (vm.activeMode === 'GlideQuery') { return vm.gqExampleCode; }
      if (vm.activeMode === 'GlideAggregate') { return vm.aggExampleCode; }
      if (vm.activeMode === 'GlideAjax') { return vm.ajaxExampleCode; }
      if (vm.activeMode === 'ScriptInclude') { return vm.siExampleCode; }
      return '';
    };
    vm.currentExampleHtml = function () {
      if (vm.activeMode === 'GlideRecord') { return vm.exampleHtml; }
      if (vm.activeMode === 'GlideQuery') { return vm.gqExampleHtml; }
      if (vm.activeMode === 'GlideAggregate') { return vm.aggExampleHtml; }
      if (vm.activeMode === 'GlideAjax') { return vm.ajaxExampleHtml; }
      if (vm.activeMode === 'ScriptInclude') { return vm.siExampleHtml; }
      return null;
    };
    // GlideRecord's example warns when it hard-codes a sys_id (get-by-sys_id/update/delete);
    // GlideAjax's example warns whenever one of its own data params looks like a sys_id (matches
    // the original's per-mode `/sys.?id/i` check on the ajax call's param list); Script Include's
    // example (server usage OR GlideAjax usage - see ExampleCallService.buildSiExampleCall) warns
    // whenever any enabled get/update/delete method takes one, regardless of callable mode - every
    // shape hard-codes the same sys_id placeholder for that method.
    vm.currentExampleWarn = function () {
      if (vm.activeMode === 'GlideRecord') { return vm.exampleHasHardcodedSysId; }
      if (vm.activeMode === 'GlideQuery') { return vm.gqExampleHasHardcodedSysId; }
      if (vm.activeMode === 'GlideAjax') {
        var params = (vm.ajaxState.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
        var dataParams = params.slice(0, -1);
        return dataParams.some(function (p) { return /sys.?id/i.test(p); });
      }
      if (vm.activeMode === 'ScriptInclude') {
        var sm = vm.siState.methods;
        return (sm.read && sm.read.on) || (sm.update && sm.update.on) || (sm.delete && sm.delete.on);
      }
      return false;
    };

    vm.exampleCopyStatus = 'Copy';
    vm.copyExampleCode = function () {
      var code = vm.currentExampleCode();
      if (!code || !navigator.clipboard || !navigator.clipboard.writeText) { return; }
      navigator.clipboard.writeText(code).then(function () {
        $scope.$applyAsync(function () {
          vm.exampleCopyStatus = 'Copied ✓';
          setTimeout(function () { $scope.$applyAsync(function () { vm.exampleCopyStatus = 'Copy'; }); }, 1300);
        });
      });
    };
  };