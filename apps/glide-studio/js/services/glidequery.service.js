/* GlideQuery codegen. Pure functions, same discipline as CodegenService/AggregateService - reuses
   CodegenService via DI instead of duplicating camel/cap/deriveVar/etc.

   One deliberate departure from genGlideRecord/genGlideAggregate's style: those build a MUTABLE
   instance (`var v = new GlideRecord(...)`) and call methods on it as separate statements, because
   GlideRecord/GlideAggregate mutate in place. GlideQuery is an immutable fluent builder - `.where()`/
   `.orderBy()`/`.limit()`/`.select()` each return a NEW query stage rather than mutating the
   receiver, so `v.where(...);` as a bare statement would silently discard the clause. genGlideQuery
   therefore always builds ONE chained expression (matching the standards doc's own GlideQuery
   example), never an intermediate query-object variable. */
angular.module('glideStudio').factory('GlideQueryService', ['CodegenService', function (CodegenService) {
  'use strict';

  function deriveGqFnName(s, tableLabels) {
    var t = (s.table || '').trim();
    var pascal = t ? CodegenService.cap(CodegenService.varBaseFromTable(t, tableLabels)) : 'Record';
    var op = s.operation;
    if (op === 'get') { return 'get' + pascal; }
    if (op === 'queryReturn') { return 'get' + pascal + 's'; }
    if (op === 'count') { return 'count' + pascal + 's'; }
    if (op === 'insert') { return 'insert' + pascal; }
    if (op === 'update') { return 'update' + pascal + 's'; }
    if (op === 'deleteMultiple') { return 'delete' + pascal + 's'; }
    return '';
  }

  function deriveGqFnParams(s) {
    var op = s.operation;
    if (op === 'get') {
      var gm = s.getMethod || 'sysId';
      return gm === 'encodedQuery' ? 'encodedQuery' : 'sysId';
    }
    if (op === 'insert') { return 'fields'; }
    if (op === 'update') { return 'encodedQuery, fields'; }
    return 'encodedQuery'; // queryReturn, count, deleteMultiple
  }

  // s: the GlideQuery mode's form state (table/operation/getMethod/selectFields/orderBys/useLimit/
  // limit/fnParams).
  function genGlideQuery(s) {
    var t = (s.table || 'table_name').trim();
    var op = s.operation;
    var gm = s.getMethod || 'sysId';
    var selectFields = (s.selectFields || []).map(function (f) { return f.trim(); }).filter(Boolean);
    var fieldArgs = selectFields.map(function (f) { return "'" + f + "'"; }).join(', ');
    var params = (s.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
    var L = [];

    if (op === 'get') {
      var idParam = params[0] || (gm === 'encodedQuery' ? 'encodedQuery' : 'sysId');
      L.push("return new GlideQuery('" + t + "')");
      L.push(gm === 'encodedQuery' ? '  .where(' + idParam + ')' : "  .where('sys_id', " + idParam + ')');
      L.push('  .selectOne(' + fieldArgs + ')');
      L.push('  .orElse(null);');
      return L.join('\n');
    }

    if (op === 'count') {
      var qParam = params[0] || 'encodedQuery';
      L.push("return new GlideQuery('" + t + "')");
      L.push('  .where(' + qParam + ')');
      L.push('  .count();');
      return L.join('\n');
    }

    if (op === 'insert') {
      L.push('// fields is a plain object of field/value pairs - GlideQuery applies it directly, no per-field setValue loop needed.');
      L.push("return new GlideQuery('" + t + "')");
      L.push('  .insert(fields)');
      L.push('  .orElse(null);');
      return L.join('\n');
    }

    var qParam2 = params[0] || 'encodedQuery';

    // queryReturn/update return a lazy Stream - always materialize it via forEach into a plain
    // array before returning, so the caller never has to think about Stream semantics at all.
    if (op === 'queryReturn') {
      L.push('var results = [];');
      L.push("new GlideQuery('" + t + "')");
      L.push('  .where(' + qParam2 + ')');
      (s.orderBys || []).filter(function (o) { return o.field.trim(); }).forEach(function (o) {
        L.push('  .' + (o.dir === 'desc' ? 'orderByDesc' : 'orderBy') + "('" + o.field.trim() + "')");
      });
      if (s.useLimit) { L.push('  .limit(' + (parseInt(s.limit, 10) || 10) + ')'); }
      L.push('  .select(' + fieldArgs + ')');
      L.push('  .forEach(function (record) {');
      L.push('    results.push(record);');
      L.push('  });');
      L.push('');
      L.push('return results;');
      return L.join('\n');
    }

    if (op === 'update') {
      var fieldsParam = params[1] || 'fields';
      L.push('var results = [];');
      L.push("new GlideQuery('" + t + "')");
      L.push('  .where(' + qParam2 + ')');
      L.push('  .update(' + fieldsParam + ')');
      L.push('  .forEach(function (record) {');
      L.push('    results.push(record);');
      L.push('  });');
      L.push('');
      L.push('return results;');
      return L.join('\n');
    }

    if (op === 'deleteMultiple') {
      L.push("return new GlideQuery('" + t + "')");
      L.push('  .where(' + qParam2 + ')');
      L.push('  .deleteMultiple();');
      return L.join('\n');
    }

    return '';
  }

  return {
    deriveGqFnName: deriveGqFnName,
    deriveGqFnParams: deriveGqFnParams,
    genGlideQuery: genGlideQuery,
  };
}]);
