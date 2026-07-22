[
  '$rootScope', 'SchemaService', 'SchemaLiveService', 'ConnectionUiService',
  function ($rootScope, SchemaService, SchemaLiveService, ConnectionUiService) {
    'use strict';

    var svc = {
      tables: [],
      tableLabel: SchemaService.labelFor,
    };

    function setTables(list) {
      svc.tables.length = 0;
      list.forEach(function (t) { svc.tables.push(t); });
    }
    function useLiveTables() { setTables(SchemaService.liveTables()); }
    function useOfflineTables() { setTables(SchemaService.tables()); }
    useOfflineTables();

    // Field-name lists for gs-select instances. fieldsFor(table) falls back to every known field
    // across all tables when the table is blank/unrecognized, so a field picker is still useful in
    // modes with no real table concept (Encoder) or before a valid table has been typed.
    var ALL_FIELD_NAMES = (function () {
      var seen = {};
      var out = [];
      Object.keys(SchemaService.DEFAULT_SCHEMA).forEach(function (t) {
        SchemaService.fieldsFor(t).forEach(function (f) { if (!seen[f.name]) { seen[f.name] = true; out.push(f.name); } });
      });
      return out.sort();
    })();
    // Memoized by table (+ connected/offline, see below): gs-select's gs-options="vm.fieldNames(table)"
    // binding re-evaluates this expression every digest, and Angular's isolate-scope `=` binding
    // dirty-checks by reference - a fresh .map() array on every call looks like a "change" on every
    // single digest, which caused a real $rootScope:infdig (infinite digest) error. Returning the
    // same cached array reference for a given table keeps the binding stable.
    //
    // Cache key includes connected-ness so a single connect/disconnect toggle never needs to flush
    // the whole cache: while connected, only SchemaService.liveFieldsFor (no hardcoded fallback - a
    // real instance's own fields, not this tool's offline defaults, even for a table name like
    // "incident" that happens to also be one of those defaults) is used, and an empty result means
    // "still loading" rather than falling back to ALL_FIELD_NAMES. Disconnecting reverts to the
    // '|offline' slot, already correctly populated (or lazily computed fresh) from before.
    var fieldNameCache = {};
    svc.fieldNames = function (table) {
      var key = table || '';
      var connected = ConnectionUiService.connection.status === 'connected';
      var cacheKey = key + (connected ? '|live' : '|offline');
      if (!fieldNameCache[cacheKey]) {
        var fields = (connected ? SchemaService.liveFieldsFor(table) : SchemaService.fieldsFor(table)).map(function (f) { return f.name; });
        fieldNameCache[cacheKey] = fields.length ? fields : (connected ? [] : ALL_FIELD_NAMES);
      }
      return fieldNameCache[cacheKey];
    };
    // Called once after a live field pull completes for `table` (see ensureFieldsLoaded below) - a
    // ONE-TIME cache drop when real data legitimately changed, not a per-digest recompute, so it
    // doesn't reintroduce the infinite-digest issue the memoization above exists to prevent. Only
    // the '|live' slot can ever go stale this way (ensureFieldsLoaded is a no-op unless connected),
    // so that's the only one cleared.
    function invalidateFieldCache(table) { delete fieldNameCache[(table || '') + '|live']; }

    // Pulls a table's real fields on demand the first time it's needed while connected (never a
    // bulk pull) and invalidates the cached field-name list so gs-select instances immediately
    // reflect the real schema instead of the offline default.
    var fieldsLoadedFor = {};
    svc.ensureFieldsLoaded = function (table) {
      if (ConnectionUiService.connection.status !== 'connected' || !table || fieldsLoadedFor[table]) { return; }
      fieldsLoadedFor[table] = true;
      SchemaLiveService.pullTableFields(table, ConnectionUiService.connection).then(function () {
        invalidateFieldCache(table);
      }).catch(function () { fieldsLoadedFor[table] = false; });
    };
    // Wired to gs-select's gs-live-search on every table picker - debounced search-as-you-type
    // against the real instance, merging into the same options array every table gs-select reads.
    svc.searchTables = function (query) {
      if (ConnectionUiService.connection.status !== 'connected') { return null; }
      return SchemaLiveService.searchInstanceTables(query, ConnectionUiService.connection).then(function () { $rootScope.$applyAsync(function () {}); });
    };

    $rootScope.$on('gs:connectionChanged', function (e, status) {
      if (status === 'connected') { useLiveTables(); } else { useOfflineTables(); }
    });

    return svc;
  }
]