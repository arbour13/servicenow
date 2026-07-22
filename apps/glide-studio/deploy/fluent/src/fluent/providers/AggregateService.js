['CodegenService', 'SchemaService', function (CodegenService, SchemaService) {
  'use strict';

  var AGG_FNS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
  var AGG_WORD = { COUNT: 'Count', SUM: 'Sum', AVG: 'Avg', MIN: 'Min', MAX: 'Max' };
  // Field types usable with each aggregate function - SUM/AVG need real numbers, MIN/MAX also
  // allow dates (they're ordered), COUNT has no restriction (any field works for a distinct count).
  var AGG_FIELD_TYPES = {
    SUM: ['integer', 'decimal'],
    AVG: ['integer', 'decimal'],
    MIN: ['integer', 'decimal', 'glide_date', 'glide_date_time'],
    MAX: ['integer', 'decimal', 'glide_date', 'glide_date_time'],
  };

  function aggFieldExcluded(fn, table, fieldName) {
    var allowed = AGG_FIELD_TYPES[fn];
    if (!allowed) { return false; }
    var info = SchemaService.fieldsFor(table).find(function (f) { return f.name === fieldName; });
    return !!info && allowed.indexOf(info.type) === -1;
  }

  // The aggregate whose value the function name and count-return both reflect.
  function primaryAggregate(s) {
    var aggs = s.aggregates.filter(function (a) { return a.fn; });
    return aggs.filter(function (a) { return a.fn === 'COUNT'; })[0] || aggs[0] || { fn: 'COUNT', field: '' };
  }

  // The word used in derived function/variable names: the single aggregate's own name (e.g.
  // "CostSum"), or a generic "Stats" once multiple aggregates are combined.
  function aggNameWord(s) {
    var aggs = s.aggregates.filter(function (a) { return a.fn; });
    if (aggs.length > 1) { return 'Stats'; }
    var primary = primaryAggregate(s);
    if (primary.fn === 'COUNT') { return 'Count'; }
    var fieldPart = primary.field.trim() ? CodegenService.cap(CodegenService.camel(primary.field)) : '';
    return fieldPart + (AGG_WORD[primary.fn] || 'Count');
  }

  // The return shape the generated function must have, derived from what's actually configured:
  // Group by present -> array of rows; otherwise one row, scalar (1 aggregate) or object (2+).
  function aggShape(s) {
    var groups = s.groupBys.filter(function (g) { return g.field.trim(); });
    if (groups.length > 0) { return 'array'; }
    var aggs = s.aggregates.filter(function (a) { return a.fn; });
    return aggs.length > 1 ? 'object' : 'scalar';
  }

  function aggVarName(a) {
    var n = a.fn.toLowerCase();
    if (a.field.trim()) { n += CodegenService.cap(CodegenService.camel(a.field)); }
    return n;
  }

  function deriveAggFnName(s, tableLabels) {
    var t = (s.table || '').trim();
    var pascal = t ? CodegenService.cap(CodegenService.varBaseFromTable(t, tableLabels)) : 'Record';
    return 'get' + pascal + aggNameWord(s);
  }
  // GlideAggregate always takes a single encodedQuery parameter (aggregates/grouping/having are
  // structural, baked into the function - only the row filter varies at runtime).
  function deriveAggFnParams() { return 'encodedQuery'; }

  function genGlideAggregate(s) {
    var v = (s.aggVar || '').trim() || 'recordGa';
    var t = (s.table || 'table_name').trim();
    var L = [];
    L.push('var ' + v + " = new GlideAggregate('" + t + "');");
    L.push('');
    var firstParam = (s.fnParams || '').split(',')[0].trim();
    if (firstParam) { L.push(v + '.addEncodedQuery(' + firstParam + ');'); }

    var aggs = s.aggregates.filter(function (a) { return a.fn; });
    aggs.forEach(function (a) {
      if (a.field.trim()) { L.push(v + ".addAggregate('" + a.fn + "', '" + a.field.trim() + "');"); }
      else { L.push(v + ".addAggregate('" + a.fn + "');"); }
    });

    var groups = s.groupBys.filter(function (g) { return g.field.trim(); });
    groups.forEach(function (g) { L.push(v + ".groupBy('" + g.field.trim() + "');"); });
    groups.forEach(function (g) {
      if (g.order === 'asc') { L.push(v + ".orderBy('" + g.field.trim() + "');"); }
      else if (g.order === 'desc') { L.push(v + ".orderByDesc('" + g.field.trim() + "');"); }
    });

    s.havings.filter(function (h) { return h.value.trim() !== ''; }).forEach(function (h) {
      L.push(v + ".addHaving('" + h.fn + "', '" + h.op + "', " + CodegenService.fmtVal(h.value) + ');');
    });

    L.push(v + '.query();');
    L.push('');

    var aggArgs = function (a) { return a.field.trim() ? "'" + a.fn + "', '" + a.field.trim() + "'" : "'" + a.fn + "'"; };
    var shape = aggShape(s);
    if (shape === 'array') {
      L.push('var results = [];');
      L.push('while (' + v + '.next()) {');
      L.push('  results.push({');
      var rowLines = [];
      groups.forEach(function (g) { rowLines.push('    ' + CodegenService.camel(g.field) + ": " + v + ".getValue('" + g.field.trim() + "')"); });
      aggs.forEach(function (a) { rowLines.push('    ' + aggVarName(a) + ': parseInt(' + v + '.getAggregate(' + aggArgs(a) + '), 10)'); });
      L.push(rowLines.join(',\n'));
      L.push('  });');
      L.push('}');
      L.push('');
      L.push('return results;');
    } else if (shape === 'object') {
      L.push('if (' + v + '.next()) {');
      L.push('  return {');
      L.push(aggs.map(function (a) { return '    ' + aggVarName(a) + ': parseInt(' + v + '.getAggregate(' + aggArgs(a) + '), 10)'; }).join(',\n'));
      L.push('  };');
      L.push('}');
      L.push('');
      L.push('return null;');
    } else {
      var only = aggs[0] || { fn: 'COUNT', field: '' };
      L.push('if (' + v + '.next()) {');
      L.push('  return parseInt(' + v + '.getAggregate(' + aggArgs(only) + '), 10);');
      L.push('}');
      L.push('');
      L.push('return 0;');
    }
    return L.join('\n');
  }

  return {
    AGG_FNS: AGG_FNS,
    aggFieldExcluded: aggFieldExcluded,
    primaryAggregate: primaryAggregate,
    aggNameWord: aggNameWord,
    aggShape: aggShape,
    aggVarName: aggVarName,
    deriveAggFnName: deriveAggFnName,
    deriveAggFnParams: deriveAggFnParams,
    genGlideAggregate: genGlideAggregate,
  };
}]