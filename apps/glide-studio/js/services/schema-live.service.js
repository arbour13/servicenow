/* Connected-mode lazy schema pulls. Mutates SchemaService's live overlay - never a bulk pull:
   search returns a handful of matching table names, and a table's fields are only pulled once
   it's actually selected. */
angular.module('glideStudio').factory('SchemaLiveService', ['ConnectionService', 'SchemaService', function (ConnectionService, SchemaService) {
  'use strict';

  var SN_FIELD_TYPE_MAP = {
    integer: 'integer', decimal: 'decimal', floating_point_number: 'decimal',
    currency: 'decimal', price: 'decimal', percent_complete: 'decimal',
    boolean: 'boolean', reference: 'reference', document_id: 'reference',
    glide_date: 'glide_date', due_date: 'glide_date',
    glide_date_time: 'glide_date_time',
    choice: 'choice', sys_class_name: 'choice',
    glide_list: 'glide_list',
  };
  function mapSnFieldType(internalType) { return SN_FIELD_TYPE_MAP[internalType] || 'string'; }

  // Parses a table search box into a ServiceNow-style operator, honoring the `*` wildcard:
  //   inc*    -> STARTSWITH inc   (trailing star)
  //   *task   -> ENDSWITH task    (leading star)
  //   inc / *inc* -> LIKE inc     (contains; no star, or wrapped)
  // Returns null for an empty / stars-only query.
  function parseTableSearch(raw) {
    var s = String(raw || '').trim();
    var starts = s.charAt(0) === '*';
    var ends = s.charAt(s.length - 1) === '*';
    var core = s.replace(/^\*+/, '').replace(/\*+$/, '');
    if (!core) { return null; }
    var op = (starts && !ends) ? 'ENDSWITH' : (ends && !starts) ? 'STARTSWITH' : 'LIKE';
    return { core: core, op: op };
  }

  // Up to a handful of tables whose name or label matches `query` (honoring the `*` wildcard - see
  // parseTableSearch). Registers each into SchemaService (name + label) as a side effect so
  // gs-select's table list picks them up.
  function searchInstanceTables(query, conn) {
    var parsed = parseTableSearch(query);
    if (!parsed) { return Promise.resolve([]); }
    var enc = 'name' + parsed.op + parsed.core + '^ORlabel' + parsed.op + parsed.core;
    return ConnectionService.apiFetch('/api/now/table/sys_db_object', {
      sysparm_query: enc + '^ORDERBYname',
      sysparm_limit: '20',
      sysparm_fields: 'name,label',
    }, conn).then(function (rows) {
      rows.forEach(function (r) { if (r.name) { SchemaService.addLiveTable(r.name, r.label); } });
      return rows.map(function (r) { return r.name; });
    });
  }

  // Registers ONE table by its exact technical name into SchemaService's live table list, with the
  // real instance label pulled from sys_db_object. Unlike searchInstanceTables (a name/label LIKE
  // match for type-ahead), this is an exact name= lookup for a table we already know we want -
  // used to seed a known default table (incident) on connect so its picker recognizes it as the
  // instance's own table (real label, present in the dropdown) rather than a bare name string.
  // Safe no-op if the instance has no such table: resolves without registering anything.
  function ensureTableRegistered(table, conn) {
    if (!table) { return Promise.resolve(null); }
    return ConnectionService.apiFetch('/api/now/table/sys_db_object', {
      sysparm_query: 'name=' + table,
      sysparm_fields: 'name,label',
      sysparm_limit: '1',
    }, conn).then(function (rows) {
      if (rows[0] && rows[0].name) { SchemaService.addLiveTable(rows[0].name, rows[0].label); }
      return rows[0] || null;
    });
  }

  // Resolves a table's full inheritance chain (the table itself plus every parent it extends),
  // walking sys_db_object.super_class up the tree. Needed because sys_dictionary stores each column
  // ONCE, against the table that DEFINES it - so a plain `name=incident` field query misses every
  // column incident inherits from task (short_description, priority, assigned_to, state, number,
  // ...), which is most of the useful ones. Bounded loop (cycle guard + hard cap) so a malformed
  // super_class reference can't spin forever. Dot-walks `super_class.name` (default value, not
  // display) to get each parent's technical name directly.
  function tableHierarchy(table, conn) {
    var chain = [];
    function step(t) {
      if (!t || chain.indexOf(t) !== -1 || chain.length >= 20) { return Promise.resolve(chain); }
      chain.push(t);
      return ConnectionService.apiFetch('/api/now/table/sys_db_object', {
        sysparm_query: 'name=' + t,
        sysparm_fields: 'super_class.name',
        sysparm_limit: '1',
      }, conn).then(function (rows) {
        var parent = rows[0] && rows[0]['super_class.name'];
        return parent ? step(parent) : chain;
      });
    }
    return step(table);
  }

  // Pulls one table's fields on demand and stores them into SchemaService (setLiveFields) - never
  // pulls more than one table's fields at a time. Queries the WHOLE inheritance chain
  // (nameIN<table,parents…>, see tableHierarchy) so inherited columns are included, not just those
  // defined directly on `table`. `nameIN` (a single condition) keeps the `^element!=NULL` filter
  // ANDed across every table in the chain - `name=a^ORname=b^element!=NULL` would wrongly scope
  // element!=NULL to only the last one. `reference.name` is a dot-walk the Table API resolves
  // straight to the referenced table's technical name as a plain string. A child that overrides an
  // inherited column produces a second sys_dictionary row with the same element - the seen-guard
  // keeps the first (overrides change attributes like mandatory/default, not type/reference).
  function pullTableFields(table, conn) {
    return tableHierarchy(table, conn).then(function (chain) {
      var scope = chain.length ? 'nameIN' + chain.join(',') : 'name=' + table;
      return ConnectionService.apiFetch('/api/now/table/sys_dictionary', {
        sysparm_query: scope + '^element!=NULL^ORDERBYelement',
        sysparm_fields: 'element,internal_type,reference.name',
        sysparm_display_value: 'true',
        sysparm_limit: '2000',
      }, conn);
    }).then(function (rows) {
      var seen = {};
      var fields = [];
      rows.forEach(function (r) {
        if (!r.element || seen[r.element]) { return; }
        seen[r.element] = true;
        var type = mapSnFieldType(r.internal_type);
        var field = { name: r.element, type: type };
        if (type === 'reference' && r['reference.name']) { field.refTable = r['reference.name']; }
        fields.push(field);
      });
      SchemaService.setLiveFields(table, fields);
      return fields;
    });
  }

  // Choice values for one field, lazily pulled (key: "<table>.<field>"), cached by the caller.
  function pullFieldChoices(table, field, conn) {
    return ConnectionService.apiFetch('/api/now/table/sys_choice', {
      sysparm_query: 'name=' + table + '^element=' + field + '^language=en^ORDERBYsequence',
      sysparm_fields: 'value,label',
      sysparm_limit: '100',
    }, conn).then(function (rows) {
      return rows.map(function (r) { return { value: r.value, label: r.label || r.value }; });
    });
  }

  // Resolves (and caches) the field ServiceNow uses as a table's display value when it's
  // referenced from elsewhere (sys_dictionary's `display` flag) - needed to search records by
  // something human-readable rather than guessing a field name per table.
  var displayFieldCache = {};
  function getDisplayField(table, conn) {
    if (displayFieldCache[table]) { return Promise.resolve(displayFieldCache[table]); }
    return ConnectionService.apiFetch('/api/now/table/sys_dictionary', {
      sysparm_query: 'name=' + table + '^display=true',
      sysparm_fields: 'element',
      sysparm_limit: '1',
    }, conn).then(function (rows) {
      return (displayFieldCache[table] = (rows[0] && rows[0].element) || 'sys_id');
    });
  }
  // Searches real records on a reference field's target table by its display field - avoids
  // depending on ServiceNow's text-search index (123TEXTQUERY321), which isn't guaranteed to be
  // configured on every table, whereas a plain LIKE query against a known field always works.
  function searchReferenceRecords(refTable, text, conn) {
    return getDisplayField(refTable, conn).then(function (displayField) {
      return ConnectionService.apiFetch('/api/now/table/' + refTable, {
        sysparm_query: displayField + 'LIKE' + text,
        sysparm_limit: '10',
        sysparm_fields: 'sys_id,' + displayField,
        sysparm_display_value: 'true',
      }, conn).then(function (rows) {
        return rows.map(function (r) { return { sysId: r.sys_id, label: r[displayField] || r.sys_id }; });
      });
    });
  }
  // Read-only: fetches up to 10 real records for the given table/encoded query. Never writes.
  function previewRecords(table, encodedQuery, conn) {
    var params = { sysparm_limit: '10', sysparm_display_value: 'true' };
    if (encodedQuery) { params.sysparm_query = encodedQuery; }
    return ConnectionService.apiFetch('/api/now/table/' + table, params, conn);
  }

  // Read-only: runs the real Aggregate/Stats API for the given table/encoded query, using the
  // currently configured aggregates/groupBy. Never writes. v1 sends only the first configured
  // groupBy field (ServiceNow's multi-field sysparm_group_by behavior isn't being guessed at
  // here) and skips sysparm_having (exact syntax not verified against a real instance) - both
  // flagged as the pieces most likely to need a follow-up pass against a real instance.
  function previewAggregate(table, encodedQuery, aggregates, groupBys, conn) {
    var params = { sysparm_display_value: 'true' };
    if (encodedQuery) { params.sysparm_query = encodedQuery; }
    var sums = [], avgs = [], mins = [], maxes = [];
    (aggregates || []).filter(function (a) { return a.fn; }).forEach(function (a) {
      if (a.fn === 'COUNT') { params.sysparm_count = 'true'; }
      else if (a.fn === 'SUM') { sums.push(a.field); }
      else if (a.fn === 'AVG') { avgs.push(a.field); }
      else if (a.fn === 'MIN') { mins.push(a.field); }
      else if (a.fn === 'MAX') { maxes.push(a.field); }
    });
    if (sums.length) { params.sysparm_sum_fields = sums.join(','); }
    if (avgs.length) { params.sysparm_avg_fields = avgs.join(','); }
    if (mins.length) { params.sysparm_min_fields = mins.join(','); }
    if (maxes.length) { params.sysparm_max_fields = maxes.join(','); }
    var groupField = (groupBys || []).map(function (g) { return (g.field || '').trim(); }).filter(Boolean)[0];
    if (groupField) { params.sysparm_group_by = groupField; }
    return ConnectionService.apiFetch('/api/now/stats/' + table, params, conn);
  }

  return {
    searchInstanceTables: searchInstanceTables,
    ensureTableRegistered: ensureTableRegistered,
    pullTableFields: pullTableFields,
    pullFieldChoices: pullFieldChoices,
    getDisplayField: getDisplayField,
    searchReferenceRecords: searchReferenceRecords,
    previewRecords: previewRecords,
    previewAggregate: previewAggregate,
  };
}]);
