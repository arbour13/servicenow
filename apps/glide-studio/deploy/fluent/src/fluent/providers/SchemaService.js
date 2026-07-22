function () {
  'use strict';

  var COMMON = [
    { name: 'sys_id', type: 'string' }, { name: 'number', type: 'string' },
    { name: 'short_description', type: 'string' }, { name: 'description', type: 'string' },
    { name: 'state', type: 'integer' }, { name: 'active', type: 'boolean' },
    { name: 'priority', type: 'integer' }, { name: 'urgency', type: 'integer' }, { name: 'impact', type: 'integer' },
    { name: 'category', type: 'string' }, { name: 'subcategory', type: 'string' },
    { name: 'assigned_to', type: 'reference' }, { name: 'assignment_group', type: 'reference' },
    { name: 'caller_id', type: 'reference' }, { name: 'opened_by', type: 'reference' },
    { name: 'opened_at', type: 'glide_date_time' }, { name: 'closed_at', type: 'glide_date_time' },
    { name: 'sys_created_on', type: 'glide_date_time' }, { name: 'sys_created_by', type: 'string' },
    { name: 'sys_updated_on', type: 'glide_date_time' }, { name: 'sys_updated_by', type: 'string' },
  ];

  var DEFAULT_SCHEMA = {
    incident: COMMON,
    problem: COMMON,
    change_request: [
      { name: 'sys_id', type: 'string' }, { name: 'number', type: 'string' },
      { name: 'short_description', type: 'string' }, { name: 'description', type: 'string' },
      { name: 'state', type: 'integer' }, { name: 'type', type: 'string' }, { name: 'risk', type: 'integer' },
      { name: 'priority', type: 'integer' }, { name: 'assigned_to', type: 'reference' },
      { name: 'assignment_group', type: 'reference' }, { name: 'start_date', type: 'glide_date_time' },
      { name: 'end_date', type: 'glide_date_time' }, { name: 'sys_created_on', type: 'glide_date_time' },
    ],
    task: [
      { name: 'sys_id', type: 'string' }, { name: 'number', type: 'string' },
      { name: 'short_description', type: 'string' }, { name: 'description', type: 'string' },
      { name: 'state', type: 'integer' }, { name: 'active', type: 'boolean' }, { name: 'priority', type: 'integer' },
      { name: 'assigned_to', type: 'reference' }, { name: 'assignment_group', type: 'reference' },
      { name: 'due_date', type: 'glide_date_time' }, { name: 'sys_created_on', type: 'glide_date_time' },
    ],
    sys_user: [
      { name: 'sys_id', type: 'string' }, { name: 'user_name', type: 'string' }, { name: 'name', type: 'string' },
      { name: 'first_name', type: 'string' }, { name: 'last_name', type: 'string' }, { name: 'email', type: 'string' },
      { name: 'active', type: 'boolean' }, { name: 'department', type: 'reference' }, { name: 'manager', type: 'reference' },
      { name: 'title', type: 'string' }, { name: 'location', type: 'reference' }, { name: 'company', type: 'reference' },
    ],
    sys_user_group: [
      { name: 'sys_id', type: 'string' }, { name: 'name', type: 'string' }, { name: 'description', type: 'string' },
      { name: 'active', type: 'boolean' }, { name: 'manager', type: 'reference' }, { name: 'type', type: 'string' }, { name: 'email', type: 'string' },
    ],
    cmdb_ci: [
      { name: 'sys_id', type: 'string' }, { name: 'name', type: 'string' }, { name: 'asset_tag', type: 'string' },
      { name: 'serial_number', type: 'string' }, { name: 'model_id', type: 'reference' },
      { name: 'install_status', type: 'integer' }, { name: 'operational_status', type: 'integer' },
      { name: 'assigned_to', type: 'reference' }, { name: 'location', type: 'reference' }, { name: 'company', type: 'reference' },
    ],
    sc_request: [
      { name: 'sys_id', type: 'string' }, { name: 'number', type: 'string' }, { name: 'requested_for', type: 'reference' },
      { name: 'request_state', type: 'string' }, { name: 'stage', type: 'string' }, { name: 'price', type: 'decimal' },
      { name: 'approval', type: 'string' }, { name: 'opened_at', type: 'glide_date_time' },
    ],
    sc_req_item: [
      { name: 'sys_id', type: 'string' }, { name: 'number', type: 'string' }, { name: 'cat_item', type: 'reference' },
      { name: 'request', type: 'reference' }, { name: 'stage', type: 'string' }, { name: 'state', type: 'integer' },
      { name: 'quantity', type: 'decimal' }, { name: 'price', type: 'decimal' }, { name: 'assigned_to', type: 'reference' },
    ],
    kb_knowledge: [
      { name: 'sys_id', type: 'string' }, { name: 'number', type: 'string' }, { name: 'short_description', type: 'string' },
      { name: 'text', type: 'string' }, { name: 'workflow_state', type: 'string' }, { name: 'published', type: 'boolean' },
      { name: 'valid_to', type: 'glide_date' }, { name: 'author', type: 'reference' }, { name: 'kb_knowledge_base', type: 'reference' },
    ],
  };

  // Live overlay for Connected mode (see SchemaLiveService): tables discovered via instance
  // search and fields pulled for a specific table override/extend the offline defaults above.
  // Both caches are SINGLE stable arrays/objects, mutated in place (push, never reassigned) -
  // anything bound to one via an Angular `=` binding (reference-based dirty checking) sees new
  // entries for free with no rebind, and critically never trips the infdig bug a *replaced*
  // reference would (see CodegenService/EncoderService's memoization comments for the full story
  // on that class of bug in this app).
  //
  // liveTablesCache is kept SEPARATE from the offline tablesCache (rather than merging live
  // results into it, like an earlier version of this file did) - a connected instance's real
  // table list should never be diluted with this tool's own hardcoded/offline defaults, which are
  // just a fallback for when there's no instance to ask. MainController swaps vm.tables between
  // the two (see its useLiveTables/useOfflineTables) as the connection status changes.
  var tablesCache = null;
  var liveTablesCache = [];
  var liveLabels = {};
  var liveFieldsByTable = {};

  function tables() {
    if (!tablesCache) { tablesCache = Object.keys(DEFAULT_SCHEMA).sort(); }
    return tablesCache;
  }
  function liveTables() { return liveTablesCache; }
  // Registers a table discovered via live search so it appears in table gs-selects. No-op if
  // already known.
  function addLiveTable(name, label) {
    if (!name) { return; }
    if (liveTablesCache.indexOf(name) === -1) { liveTablesCache.push(name); liveTablesCache.sort(); }
    if (label) { liveLabels[name] = label; }
  }
  function labelFor(table) { return liveLabels[table] || ''; }

  function fieldsFor(table) {
    return liveFieldsByTable[table] || DEFAULT_SCHEMA[table] || [];
  }
  // Live-pulled fields ONLY, no offline fallback - for Connected mode, where a table that happens
  // to share a name with one of this tool's own hardcoded defaults (e.g. "incident") should never
  // show that hardcoded field list even briefly; an empty result here means "still loading" (or
  // the pull hasn't been kicked off yet), not "no fields exist".
  function liveFieldsFor(table) { return liveFieldsByTable[table] || []; }
  // Stores a live-pulled field list for a table (overrides the offline default for that table,
  // if any, from then on).
  function setLiveFields(table, fields) { liveFieldsByTable[table] = fields; }

  // Looks up a field's type: first on the given table, then falls back to searching every known
  // table (a field name typed without picking a table first should still resolve, matching the
  // original's getFieldType). Defaults to 'string' when nothing matches - the safest default
  // (every operator is valid for string).
  function fieldType(fieldName, table) {
    if (!fieldName) { return 'string'; }
    var onTable = fieldsFor(table).find(function (f) { return f.name === fieldName; });
    if (onTable) { return onTable.type || 'string'; }
    var found = null;
    tables().some(function (t) {
      var f = fieldsFor(t).find(function (f) { return f.name === fieldName; });
      if (f) { found = f.type || 'string'; return true; }
      return false;
    });
    return found || 'string';
  }

  // The table a reference field points to (set by SchemaLiveService.pullTableFields's
  // `reference.name` dot-walk) - undefined for non-reference fields or when fields haven't been
  // pulled for that table yet. Same table-scoped-then-fallback-search lookup as fieldType.
  function fieldRefTable(fieldName, table) {
    if (!fieldName) { return undefined; }
    var onTable = fieldsFor(table).find(function (f) { return f.name === fieldName; });
    if (onTable) { return onTable.refTable; }
    var found;
    tables().some(function (t) {
      var f = fieldsFor(t).find(function (f) { return f.name === fieldName; });
      if (f) { found = f.refTable; return true; }
      return false;
    });
    return found;
  }

  return {
    DEFAULT_SCHEMA: DEFAULT_SCHEMA,
    tables: tables,
    liveTables: liveTables,
    addLiveTable: addLiveTable,
    labelFor: labelFor,
    fieldsFor: fieldsFor,
    liveFieldsFor: liveFieldsFor,
    setLiveFields: setLiveFields,
    fieldType: fieldType,
    fieldRefTable: fieldRefTable,
  };
}