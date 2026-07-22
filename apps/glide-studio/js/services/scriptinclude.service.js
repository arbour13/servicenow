/* Script Include codegen - a dedicated CRUD form (not a composer): each operation
   (create/read/list/update/delete) is a checkbox that also carries its own inline options (skip
   business rules, skip audit fields, return shape) - only the options relevant to THAT operation,
   mirroring GlideRecord mode's own relevance rules (setWorkflow applies broadly, autoSysFields
   only to insert/update; see codegen.service.js's genGlideRecord) rather than one pooled set of
   toggles that applied to every method uniformly.

   Client-callable output (s.callable): 'server' builds a plain Class.create Script Include (the
   only mode this file originally supported); 'ajax' builds a single AbstractAjaxProcessor whose
   methods read sysparm_* params directly and return JSON strings (no separate server class);
   'both' builds the server class AND a thin `<Class>Ajax` AbstractAjaxProcessor that delegates to
   it - server-only logic stays server-only, the wrapper only exposes what the client needs. */
angular.module('glideStudio').factory('ScriptIncludeService', ['CodegenService', function (CodegenService) {
  'use strict';

  var IND = '    ';

  function deriveV(table) { return CodegenService.deriveVar(table, 'Gr'); }
  // Pascal-cased table identifier for method names (e.g. 'incident' -> 'Incident') - the same
  // derivation CodegenService.deriveClass/deriveFnName already use elsewhere, so createIncident/
  // getIncident/etc. match the naming convention the rest of the app establishes. Exported since
  // ExampleCallService needs the exact same method names to build matching GlideAjax usage calls.
  function derivePascal(table) {
    var t = (table || '').trim();
    return t ? CodegenService.cap(CodegenService.varBaseFromTable(t)) : 'Record';
  }

  // The client-callable class name: the server class name itself in 'ajax' mode (there's only one
  // class), or that name + 'Ajax' in 'both' mode (the delegate needs a name distinct from the
  // server class it wraps). Exported for the same reason as derivePascal - the example-call panel
  // needs the exact class GlideAjax's constructor should reference.
  function ajaxClassName(s) {
    var cls = (s.className || 'RecordService').trim();
    return s.callable === 'both' ? cls + 'Ajax' : cls;
  }

  // create/update default to 'sysid' (the raw insert()/update() return - unchanged default
  // behavior); read/list default to 'gliderecord' (unchanged default). 'list' additionally
  // accepts 'sysids', which nothing else does.
  function effectiveReturnType(key, opts) {
    var def = (key === 'create' || key === 'update') ? 'sysid' : 'gliderecord';
    return (opts && opts.returnType) || def;
  }

  function fieldsArrayLiteral(fields) {
    return '[' + fields.map(function (f) { return "'" + String(f).replace(/'/g, "\\'") + "'"; }).join(', ') + ']';
  }
  // The this._toObject(gr[, fields]) call expression for a given method's options - only passes
  // the fields array when the user actually added field rows; an empty/absent list falls back to
  // _toObject's own "no fields arg -> every field" behavior, so leaving the picker untouched keeps
  // today's all-fields default.
  function toObjectExpr(v, opts) {
    var fields = (opts.fields || []).filter(Boolean);
    return fields.length ? 'this._toObject(' + v + ', ' + fieldsArrayLiteral(fields) + ')' : 'this._toObject(' + v + ')';
  }

  function jsdocLines(lines) {
    if (!lines || !lines.length) { return []; }
    var out = [IND + '/**'];
    lines.forEach(function (l) { out.push(IND + ' * ' + l); });
    out.push(IND + ' */');
    return out;
  }

  // name/params/bodyLines -> a `name: function(params) {...}` prototype member string, optionally
  // preceded by a JSDoc block at the same indent. bodyLines are body-relative (0-indent); the
  // method sits at 1×IND inside the prototype object, so its body needs a further level in, at
  // 2×IND.
  function member(name, params, bodyLines, doc) {
    var lines = (doc || []).concat([IND + name + ': function(' + params.join(', ') + ') {']);
    bodyLines.forEach(function (l) { lines.push(l ? IND + IND + l : ''); });
    lines.push(IND + '}');
    return lines.join('\n');
  }

  // Wraps bodyLines in try/catch when errorHandling is on, tailoring the catch's return value
  // per operation (false for a write that failed, null/empty for a read that found nothing) -
  // this generator always knows which CRUD kind it's building, so it can pick the right fallback
  // itself rather than guessing from the method name the way a generic wrapper would have to.
  function withErrorHandling(errorHandling, name, bodyLines, catchReturn) {
    if (!errorHandling) { return bodyLines; }
    var out = ['try {'];
    bodyLines.forEach(function (l) { out.push(l ? IND + l : ''); });
    out.push('');
    out.push('} catch (e) {');
    out.push(IND + "gs.error(this.type + '." + name + ": ' + e);");
    out.push(IND + 'return ' + catchReturn + ';');
    out.push('}');
    return out;
  }

  /* ============================= Server class (Class.create) ============================= */

  function createMember(v, t, pascal, opts, errorHandling, jsdoc) {
    var name = 'create' + pascal;
    var rt = effectiveReturnType('create', opts);
    var body = [
      "var " + v + " = new GlideRecord('" + t + "');",
      v + '.initialize();',
    ];
    if (opts.setWorkflow) { body.push(v + '.setWorkflow(false);'); }
    if (opts.autoSysFields) { body.push(v + '.autoSysFields(false);'); }
    body.push(
      '',
      'Object.keys(values).forEach(function(field) {',
      IND + v + '.setValue(field, values[field]);',
      '});',
      ''
    );
    var catchReturn;
    if (rt === 'sysid') {
      body.push('return ' + v + '.insert();');
      catchReturn = 'false';
    } else {
      body.push(
        'var newId = ' + v + '.insert();',
        '',
        'if (!newId) {',
        IND + 'return null;',
        '}',
        '',
        'return ' + (rt === 'gliderecord' ? v : toObjectExpr(v, opts)) + ';'
      );
      catchReturn = 'null';
    }
    var doc = jsdoc ? jsdocLines([
      'Creates a new ' + t + ' record.',
      '@param {Object} values - Field name/value pairs to set on the new record.',
      '@return {' + (rt === 'sysid' ? 'string' : rt === 'gliderecord' ? 'GlideRecord' : 'Object') + '} ' +
        (rt === 'sysid' ? 'The new record\'s sys_id, or false if the insert failed.' : 'The new record, or null if the insert failed.'),
    ]) : [];
    return member(name, ['values'], withErrorHandling(errorHandling, name, body, catchReturn), doc);
  }

  function readMember(v, t, pascal, opts, errorHandling, jsdoc) {
    var name = 'get' + pascal;
    var rt = effectiveReturnType('read', opts);
    var returnExpr = rt === 'object' ? toObjectExpr(v, opts) : v;
    var body = [
      "var " + v + " = new GlideRecord('" + t + "');",
      '',
      'if (' + v + '.get(sysId)) {',
      IND + 'return ' + returnExpr + ';',
      '}',
      '',
      'return null;',
    ];
    var doc = jsdoc ? jsdocLines([
      'Looks up a single ' + t + ' record by sys_id.',
      '@param {string} sysId - The record\'s sys_id.',
      '@return {' + (rt === 'object' ? 'Object' : 'GlideRecord') + '} The record, or null if not found.',
    ]) : [];
    return member(name, ['sysId'], withErrorHandling(errorHandling, name, body, 'null'), doc);
  }

  function listMember(v, t, pascal, opts, errorHandling, jsdoc) {
    var name = 'query' + pascal + 's';
    var rt = effectiveReturnType('list', opts);
    var body = [
      "var " + v + " = new GlideRecord('" + t + "');",
      '',
      'if (encodedQuery) {',
      IND + v + '.addEncodedQuery(encodedQuery);',
      '}',
    ];
    var limit = parseInt(opts.limit, 10);
    if (limit > 0) { body.push('', v + '.setLimit(' + limit + ');'); }
    body.push('', v + '.query();');
    var catchReturn;
    if (rt === 'gliderecord') {
      body.push('', 'return ' + v + ';');
      catchReturn = 'null';
    } else {
      body.push(
        '',
        'var results = [];',
        'while (' + v + '.next()) {',
        IND + 'results.push(' + (rt === 'sysids' ? v + '.getUniqueValue()' : toObjectExpr(v, opts)) + ');',
        '}',
        '',
        'return results;'
      );
      catchReturn = '[]';
    }
    var doc = jsdoc ? jsdocLines([
      'Queries ' + t + ' records.',
      '@param {string} encodedQuery - An encoded query string; falsy returns every row' + (limit > 0 ? ' (up to ' + limit + ')' : '') + '.',
      '@return {' + (rt === 'gliderecord' ? 'GlideRecord' : 'Array') + '} ' +
        (rt === 'gliderecord' ? 'A positioned GlideRecord to iterate with .next().' : rt === 'sysids' ? 'An array of matching sys_ids.' : 'An array of matching records.'),
    ]) : [];
    return member(name, ['encodedQuery'], withErrorHandling(errorHandling, name, body, catchReturn), doc);
  }

  function updateMember(v, t, pascal, opts, errorHandling, jsdoc) {
    var name = 'update' + pascal;
    var rt = effectiveReturnType('update', opts);
    var body = [
      "var " + v + " = new GlideRecord('" + t + "');",
      '',
      'if (!' + v + '.get(sysId)) {',
      IND + 'return ' + (rt === 'sysid' ? 'false' : 'null') + ';',
      '}',
    ];
    if (opts.setWorkflow) { body.push(v + '.setWorkflow(false);'); }
    if (opts.autoSysFields) { body.push(v + '.autoSysFields(false);'); }
    body.push(
      '',
      'Object.keys(values).forEach(function(field) {',
      IND + v + '.setValue(field, values[field]);',
      '});',
      ''
    );
    var catchReturn;
    if (rt === 'sysid') {
      body.push('return ' + v + '.update();');
      catchReturn = 'false';
    } else {
      body.push(
        'var updateId = ' + v + '.update();',
        '',
        'if (!updateId) {',
        IND + 'return null;',
        '}',
        '',
        'return ' + (rt === 'gliderecord' ? v : toObjectExpr(v, opts)) + ';'
      );
      catchReturn = 'null';
    }
    var doc = jsdoc ? jsdocLines([
      'Updates an existing ' + t + ' record.',
      '@param {string} sysId - The record\'s sys_id.',
      '@param {Object} values - Field name/value pairs to set.',
      '@return {' + (rt === 'sysid' ? 'string' : rt === 'gliderecord' ? 'GlideRecord' : 'Object') + '} ' +
        (rt === 'sysid' ? 'The record\'s sys_id, or false if the update failed.' : 'The updated record, or null if the update failed.'),
    ]) : [];
    return member(name, ['sysId', 'values'], withErrorHandling(errorHandling, name, body, catchReturn), doc);
  }

  function deleteMember(v, t, pascal, opts, errorHandling, jsdoc) {
    var name = 'delete' + pascal;
    var body = [
      "var " + v + " = new GlideRecord('" + t + "');",
      '',
      'if (' + v + '.get(sysId)) {',
    ];
    if (opts.setWorkflow) { body.push(IND + v + '.setWorkflow(false);'); }
    body.push(
      IND + 'return ' + v + '.deleteRecord();',
      '}',
      '',
      'return false;'
    );
    var doc = jsdoc ? jsdocLines([
      'Deletes the given ' + t + ' record.',
      '@param {string} sysId - The record\'s sys_id.',
      '@return {boolean} Whether the record was found and deleted.',
    ]) : [];
    return member(name, ['sysId'], withErrorHandling(errorHandling, name, body, 'false'), doc);
  }

  function toObjectMember(jsdoc) {
    var doc = jsdoc ? jsdocLines([
      'Flattens a GlideRecord into a plain object.',
      '@param {GlideRecord} gr - A positioned GlideRecord.',
      '@param {Array} [fields] - Field names to include; every field when omitted.',
      '@return {Object} The requested field values.',
    ]) : [];
    return member('_toObject', ['gr', 'fields'], [
      'var obj = {};',
      'if (fields && fields.length) {',
      IND + 'fields.forEach(function(f) {',
      IND + IND + 'obj[f] = gr.getValue(f);',
      IND + '});',
      '} else {',
      IND + 'gr.getFields().forEach(function(el) {',
      IND + IND + 'obj[el.getName()] = el.getValue();',
      IND + '});',
      '}',
      'return obj;',
    ], doc);
  }

  // Only added when a create/read/list/update method that's on returns 'object' shape - shared by
  // every caller that needs it, since this is a real single class here (not the standalone,
  // independently-correct templates the earlier function-bundle design used).
  function serverNeedsToObject(m) {
    return ['create', 'read', 'list', 'update'].some(function (k) {
      return m[k] && m[k].on && effectiveReturnType(k, m[k]) === 'object';
    });
  }

  // s: {className, table, varName, errorHandling, jsdoc, methods: {
  //       create: {on, setWorkflow, autoSysFields, returnType, fields}, read: {on, returnType, fields},
  //       list: {on, returnType, fields, limit}, update: {on, setWorkflow, autoSysFields, returnType, fields},
  //       delete: {on, setWorkflow},
  //     }}
  function genServerClass(s) {
    var cls = (s.className || 'RecordService').trim();
    var t = (s.table || 'table_name').trim();
    var v = CodegenService.sanitizeParamName(s.varName, deriveV(t)) || deriveV(t);
    var pascal = derivePascal(t);
    var m = s.methods || {};
    var eh = s.errorHandling;
    var jsdoc = !!s.jsdoc;

    var members = [];
    if (m.create && m.create.on) { members.push(createMember(v, t, pascal, m.create, eh, jsdoc)); }
    if (m.read && m.read.on) { members.push(readMember(v, t, pascal, m.read, eh, jsdoc)); }
    if (m.list && m.list.on) { members.push(listMember(v, t, pascal, m.list, eh, jsdoc)); }
    if (m.update && m.update.on) { members.push(updateMember(v, t, pascal, m.update, eh, jsdoc)); }
    if (m.delete && m.delete.on) { members.push(deleteMember(v, t, pascal, m.delete, eh, jsdoc)); }
    if (serverNeedsToObject(m)) { members.push(toObjectMember(jsdoc)); }

    var all = [IND + 'initialize: function() {\n' + IND + '}'].concat(members).concat([IND + "type: '" + cls + "'"]);
    return 'var ' + cls + ' = Class.create();\n' +
      cls + '.prototype = {\n' +
      all.join(',\n\n') + '\n' +
      '};';
  }

  /* ============================= Client-callable class (AbstractAjaxProcessor) =============================
     mode: 'standalone' (the whole class does its own GlideRecord work, reading sysparm_* directly)
     or 'delegate' (each method is a thin wrapper calling the server class above and JSON-encoding
     the result). Every method returns a JSON string - GlideAjax has no other way to get data back
     to the client - so a 'gliderecord' return type is coerced through _toObject either way. */

  function ajaxCreateMember(mode, v, t, pascal, opts, errorHandling, jsdoc, delegateCls) {
    var name = 'create' + pascal;
    var rt = effectiveReturnType('create', opts);
    var body = ["var values = JSON.parse(this.getParameter('sysparm_values') || '{}');", ''];
    if (mode === 'delegate') {
      body.push('var result = new ' + delegateCls + '().' + name + '(values);', '',
        'return JSON.stringify(' + (rt === 'gliderecord' ? '(result ? this._toObject(result) : null)' : 'result') + ');');
    } else {
      body.push("var " + v + " = new GlideRecord('" + t + "');", v + '.initialize();');
      if (opts.setWorkflow) { body.push(v + '.setWorkflow(false);'); }
      if (opts.autoSysFields) { body.push(v + '.autoSysFields(false);'); }
      body.push(
        '',
        'Object.keys(values).forEach(function(field) {',
        IND + v + '.setValue(field, values[field]);',
        '});',
        '',
        'var newId = ' + v + '.insert();',
        '',
        'if (!newId) {',
        IND + 'return JSON.stringify(null);',
        '}',
        '',
        'return JSON.stringify(' + (rt === 'sysid' ? 'newId' : toObjectExpr(v, opts)) + ');'
      );
    }
    var doc = jsdoc ? jsdocLines([
      'AJAX-callable: creates a new ' + t + ' record.',
      'Expects sysparm_values (a JSON-encoded object of field name/value pairs).',
      '@return {string} JSON-encoded ' + (rt === 'sysid' ? 'sys_id' : 'record') + '.',
    ]) : [];
    return member(name, [], withErrorHandling(errorHandling, name, body, 'JSON.stringify(null)'), doc);
  }

  function ajaxReadMember(mode, v, t, pascal, opts, errorHandling, jsdoc, delegateCls) {
    var name = 'get' + pascal;
    var rt = effectiveReturnType('read', opts);
    var body = ["var sysId = this.getParameter('sysparm_sys_id');", ''];
    if (mode === 'delegate') {
      body.push('var result = new ' + delegateCls + '().' + name + '(sysId);', '',
        'return JSON.stringify(' + (rt === 'gliderecord' ? '(result ? this._toObject(result) : null)' : 'result') + ');');
    } else {
      body.push(
        "var " + v + " = new GlideRecord('" + t + "');",
        '',
        'if (' + v + '.get(sysId)) {',
        IND + 'return JSON.stringify(' + toObjectExpr(v, opts) + ');',
        '}',
        '',
        'return JSON.stringify(null);'
      );
    }
    var doc = jsdoc ? jsdocLines([
      'AJAX-callable: looks up a single ' + t + ' record.',
      'Expects sysparm_sys_id.',
      '@return {string} JSON-encoded record, or "null" if not found.',
    ]) : [];
    return member(name, [], withErrorHandling(errorHandling, name, body, 'JSON.stringify(null)'), doc);
  }

  function ajaxListMember(mode, v, t, pascal, opts, errorHandling, jsdoc, delegateCls) {
    var name = 'query' + pascal + 's';
    var rt = effectiveReturnType('list', opts);
    var body = ["var encodedQuery = this.getParameter('sysparm_query');", ''];
    if (mode === 'delegate') {
      body.push('var result = new ' + delegateCls + '().' + name + '(encodedQuery);');
      if (rt === 'gliderecord') {
        body.push(
          '',
          'var results = [];',
          'while (result.next()) {',
          IND + 'results.push(this._toObject(result));',
          '}',
          '',
          'return JSON.stringify(results);'
        );
      } else {
        body.push('', 'return JSON.stringify(result);');
      }
    } else {
      body.push("var " + v + " = new GlideRecord('" + t + "');", '', 'if (encodedQuery) {', IND + v + '.addEncodedQuery(encodedQuery);', '}');
      var limit = parseInt(opts.limit, 10);
      if (limit > 0) { body.push('', v + '.setLimit(' + limit + ');'); }
      body.push(
        '', v + '.query();',
        '',
        'var results = [];',
        'while (' + v + '.next()) {',
        IND + 'results.push(' + (rt === 'sysids' ? v + '.getUniqueValue()' : toObjectExpr(v, opts)) + ');',
        '}',
        '',
        'return JSON.stringify(results);'
      );
    }
    var doc = jsdoc ? jsdocLines([
      'AJAX-callable: queries ' + t + ' records.',
      'Expects sysparm_query (an encoded query string; falsy returns every row).',
      '@return {string} JSON-encoded array of ' + (rt === 'sysids' ? 'sys_ids' : 'records') + '.',
    ]) : [];
    return member(name, [], withErrorHandling(errorHandling, name, body, 'JSON.stringify([])'), doc);
  }

  function ajaxUpdateMember(mode, v, t, pascal, opts, errorHandling, jsdoc, delegateCls) {
    var name = 'update' + pascal;
    var rt = effectiveReturnType('update', opts);
    var body = [
      "var sysId = this.getParameter('sysparm_sys_id');",
      "var values = JSON.parse(this.getParameter('sysparm_values') || '{}');",
      '',
    ];
    if (mode === 'delegate') {
      body.push('var result = new ' + delegateCls + '().' + name + '(sysId, values);', '',
        'return JSON.stringify(' + (rt === 'gliderecord' ? '(result ? this._toObject(result) : null)' : 'result') + ');');
    } else {
      body.push(
        "var " + v + " = new GlideRecord('" + t + "');",
        '',
        'if (!' + v + '.get(sysId)) {',
        IND + 'return JSON.stringify(null);',
        '}',
      );
      if (opts.setWorkflow) { body.push(v + '.setWorkflow(false);'); }
      if (opts.autoSysFields) { body.push(v + '.autoSysFields(false);'); }
      body.push(
        '',
        'Object.keys(values).forEach(function(field) {',
        IND + v + '.setValue(field, values[field]);',
        '});',
        '',
        'var updateId = ' + v + '.update();',
        '',
        'if (!updateId) {',
        IND + 'return JSON.stringify(null);',
        '}',
        '',
        'return JSON.stringify(' + (rt === 'sysid' ? 'updateId' : toObjectExpr(v, opts)) + ');'
      );
    }
    var doc = jsdoc ? jsdocLines([
      'AJAX-callable: updates an existing ' + t + ' record.',
      'Expects sysparm_sys_id and sysparm_values (a JSON-encoded object of field name/value pairs).',
      '@return {string} JSON-encoded ' + (rt === 'sysid' ? 'sys_id' : 'record') + ', or "null" if not found.',
    ]) : [];
    return member(name, [], withErrorHandling(errorHandling, name, body, 'JSON.stringify(null)'), doc);
  }

  function ajaxDeleteMember(mode, v, t, pascal, opts, errorHandling, jsdoc, delegateCls) {
    var name = 'delete' + pascal;
    var body = ["var sysId = this.getParameter('sysparm_sys_id');", ''];
    if (mode === 'delegate') {
      body.push('return JSON.stringify(new ' + delegateCls + '().' + name + '(sysId));');
    } else {
      body.push("var " + v + " = new GlideRecord('" + t + "');", '', 'if (' + v + '.get(sysId)) {');
      if (opts.setWorkflow) { body.push(IND + v + '.setWorkflow(false);'); }
      body.push(
        IND + 'return JSON.stringify(' + v + '.deleteRecord());',
        '}',
        '',
        'return JSON.stringify(false);'
      );
    }
    var doc = jsdoc ? jsdocLines([
      'AJAX-callable: deletes the given ' + t + ' record.',
      'Expects sysparm_sys_id.',
      '@return {string} JSON-encoded boolean - whether the record was deleted.',
    ]) : [];
    return member(name, [], withErrorHandling(errorHandling, name, body, 'JSON.stringify(false)'), doc);
  }

  // standalone: every non-default return type needs coercion through _toObject (list's default is
  // 'gliderecord' but that branch iterates+coerces per row too, so only 'sysids' skips it there).
  // delegate: only the 'gliderecord' coercion path touches _toObject; sys_id/object results from
  // the server class are already JSON-safe as-is.
  function ajaxMethodNeedsToObject(key, opts, mode) {
    if (!opts || !opts.on) { return false; }
    var rt = effectiveReturnType(key, opts);
    if (mode === 'standalone') { return key === 'list' ? rt !== 'sysids' : rt !== 'sysid'; }
    return rt === 'gliderecord';
  }

  function genAjaxProcessor(s) {
    var cls = ajaxClassName(s);
    var t = (s.table || 'table_name').trim();
    var v = CodegenService.sanitizeParamName(s.varName, deriveV(t)) || deriveV(t);
    var pascal = derivePascal(t);
    var m = s.methods || {};
    var eh = s.errorHandling;
    var jsdoc = !!s.jsdoc;
    var mode = s.callable === 'both' ? 'delegate' : 'standalone';
    var delegateCls = (s.className || 'RecordService').trim();

    var members = [];
    if (m.create && m.create.on) { members.push(ajaxCreateMember(mode, v, t, pascal, m.create, eh, jsdoc, delegateCls)); }
    if (m.read && m.read.on) { members.push(ajaxReadMember(mode, v, t, pascal, m.read, eh, jsdoc, delegateCls)); }
    if (m.list && m.list.on) { members.push(ajaxListMember(mode, v, t, pascal, m.list, eh, jsdoc, delegateCls)); }
    if (m.update && m.update.on) { members.push(ajaxUpdateMember(mode, v, t, pascal, m.update, eh, jsdoc, delegateCls)); }
    if (m.delete && m.delete.on) { members.push(ajaxDeleteMember(mode, v, t, pascal, m.delete, eh, jsdoc, delegateCls)); }

    var needsToObject = ['create', 'read', 'list', 'update'].some(function (k) {
      return ajaxMethodNeedsToObject(k, m[k], mode);
    });
    if (needsToObject) { members.push(toObjectMember(jsdoc)); }

    return 'var ' + cls + ' = Class.create();\n' +
      cls + '.prototype = Object.extendsObject(AbstractAjaxProcessor, {\n' +
      members.concat([IND + "type: '" + cls + "'"]).join(',\n\n') + '\n' +
      '});';
  }

  function genScriptInclude(s) {
    var callable = s.callable || 'server';
    var parts = [];
    if (callable === 'server' || callable === 'both') { parts.push(genServerClass(s)); }
    if (callable === 'ajax' || callable === 'both') {
      if (parts.length) {
        parts.push('', '// Client-callable wrapper - delegates to ' + (s.className || 'RecordService').trim() + ' above.');
      }
      parts.push(genAjaxProcessor(s));
    }
    return parts.join('\n');
  }

  return {
    genScriptInclude: genScriptInclude,
    derivePascal: derivePascal,
    ajaxClassName: ajaxClassName,
  };
}]);
