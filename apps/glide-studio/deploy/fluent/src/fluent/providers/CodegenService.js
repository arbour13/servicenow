function () {
  'use strict';

  // Formats a raw string value for embedding as a JS literal: bare true/false and numbers are
  // emitted unquoted, everything else becomes a quoted, escaped string literal. Used anywhere a
  // user-typed value (e.g. a Having clause's comparison value) needs to become code.
  function fmtVal(v) {
    var t = String(v == null ? '' : v).trim();
    if (t === '') { return "''"; }
    if (t === 'true' || t === 'false') { return t; }
    if (/^-?\d+(\.\d+)?$/.test(t)) { return t; }
    return "'" + t.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  }

  function sanitizeParamName(v, fallback) {
    var t = String(v || '').trim();
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(t) ? t : fallback;
  }

  function camel(f) {
    var seg = String(f).split('.').pop();
    var c = seg.replace(/[^a-zA-Z0-9_]/g, '').replace(/_+([a-zA-Z0-9])/g, function (m, ch) { return ch.toUpperCase(); });
    return c.charAt(0).toLowerCase() + c.slice(1) || 'value';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // "Service Offering" -> "serviceOffering". Splits on any run of non-alphanumerics, lowercases
  // the first word's leading char, title-cases the rest, drops a leading digit.
  function camelFromLabel(label) {
    var words = String(label || '').trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (!words.length) { return ''; }
    return words
      .map(function (w, i) { return (i === 0 ? w.charAt(0).toLowerCase() : w.charAt(0).toUpperCase()) + w.slice(1); })
      .join('')
      .replace(/^[0-9]+/, '');
  }

  // The identifier base for a table: the camel-cased label when known (tableLabels, populated by
  // connected-mode table search in the original - not yet ported here), otherwise the technical
  // name unchanged.
  function varBaseFromTable(table, tableLabels) {
    var t = String(table || '').trim();
    var label = t && tableLabels && tableLabels[t];
    return (label && camelFromLabel(label)) || camel(t);
  }

  function deriveVar(table, suffix, tableLabels) {
    var t = String(table || '').trim();
    if (!t) { return 'record' + suffix; }
    return varBaseFromTable(t, tableLabels) + suffix;
  }

  function deriveClass(table) {
    var t = String(table || '').trim();
    if (!t) { return 'RecordService'; }
    return cap(camel(t)) + 'Service';
  }

  // s: the GlideRecord mode's form state (table/operation/getMethod/useChooseWindow/...).
  function deriveFnParams(s) {
    var op = s.operation;
    if (op === 'get') {
      var gm = s.getMethod || 'sysId';
      if (gm === 'encodedQuery') { return 'encodedQuery'; }
      return 'sysId';
    }
    if (op === 'updateSingle') { return 'sysId, fields'; }
    if (op === 'deleteSingle') { return 'sysId'; }
    if (op === 'insert') { return 'fields'; }
    var params = 'encodedQuery';
    if (op === 'updateMultiple') { params += ', fields'; }
    if (op === 'queryReturn' && s.useChooseWindow) {
      params += ', ' + sanitizeParamName(s.chooseWindowFirst, 'first') + ', ' + sanitizeParamName(s.chooseWindowLast, 'last');
    }
    return params;
  }

  function deriveFnName(s, tableLabels) {
    var t = (s.table || '').trim();
    var pascal = t ? cap(varBaseFromTable(t, tableLabels)) : 'Record';
    var op = s.operation;
    if (op === 'get') { return 'get' + pascal; }
    if (op === 'queryReturn') { return 'get' + pascal + 's'; }
    if (op === 'insert') { return 'insert' + pascal; }
    if (op === 'updateSingle') { return 'update' + pascal; }
    if (op === 'updateMultiple') { return 'update' + pascal + 's'; }
    if (op === 'deleteSingle') { return 'delete' + pascal; }
    if (op === 'deleteMultiple') { return 'delete' + pascal + 's'; }
    return '';
  }

  function wrapTryCatch(code, sourceTag) {
    var out = ['try {'];
    code.split('\n').forEach(function (l) { out.push(l ? '  ' + l : ''); });
    out.push('');
    out.push('} catch (e) {');
    out.push("  gs.error('[" + sourceTag + "] ' + e);");
    out.push('}');
    return out.join('\n');
  }

  function wrapInFn(fnName, fnParams, code) {
    var fn = (fnName || '').trim();
    if (!fn) { return code; }
    var params = (fnParams || '').trim();
    var out = ['function ' + fn + '(' + params + ') {'];
    code.split('\n').forEach(function (l) { out.push(l ? '  ' + l : ''); });
    out.push('}');
    return out.join('\n');
  }

  // The dynamic "set each caller-supplied field" block for insert/update. isValidField guards
  // against unknown field names; values are applied with setValue.
  function fieldSetLines(v, style, pad, fnSpace) {
    var lines = [];
    var fnDecl = fnSpace ? 'function (field)' : 'function(field)';
    if (style === 'array') {
      lines.push(pad + 'fields.forEach(' + fnDecl + ' {');
      lines.push(pad + '  if (' + v + '.isValidField(field.name)) {');
      lines.push(pad + '    ' + v + '.setValue(field.name, field.value);');
      lines.push(pad + '  }');
      lines.push(pad + '});');
    } else {
      lines.push(pad + 'for (var fieldName in fields) {');
      lines.push(pad + '  if (' + v + '.isValidField(fieldName)) {');
      lines.push(pad + '    ' + v + '.setValue(fieldName, fields[fieldName]);');
      lines.push(pad + '  }');
      lines.push(pad + '}');
    }
    return lines;
  }

  // s: the full GlideRecord mode form state. Ported line-for-line from the original
  // genGlideRecord() - only the `state.` reads became `s.` reads (pure function, no closure
  // over shared mutable state).
  function genGlideRecord(s) {
    var v = (s.varName || '').trim() || 'recordGr';
    var t = (s.table || 'table_name').trim();
    var op = s.operation;
    var ma = s.multiAction || 'return';
    var L = [];
    var gm = s.getMethod || 'sysId';
    // GlideRecordSecure enforces the caller's ACLs (see the "Enforce ACLs in Server Code" standard);
    // it shares GlideRecord's API, so only the constructor changes.
    var cls = s.secure ? 'GlideRecordSecure' : 'GlideRecord';
    L.push('var ' + v + ' = new ' + cls + "('" + t + "');");
    L.push('');

    if (op === 'insert') {
      L.push(v + '.initialize();');
      L.push('');
      fieldSetLines(v, s.insertInputStyle, '', false).forEach(function (ln) { L.push(ln); });
      if (s.autoSysFields) { L.push(v + '.autoSysFields(false);'); }
      if (s.setWorkflow) { L.push(v + '.setWorkflow(false);'); }
      L.push('');
      L.push(s.withRefs ? 'return ' + v + '.insertWithReferences();' : 'return ' + v + '.insert();');
      return L.join('\n');
    }

    if (op === 'get' || op === 'updateSingle' || op === 'deleteSingle') {
      if (op === 'get' && gm === 'encodedQuery') {
        var firstParamEq = (s.fnParams || '').split(',')[0].trim();
        if (firstParamEq) { L.push(v + '.addEncodedQuery(' + firstParamEq + ');'); }
        L.push(v + '.setLimit(1);');
        if (s.setWorkflow) { L.push(v + '.setWorkflow(false);'); }
        L.push(v + '.query();');
        L.push('');
        L.push('if (' + v + '.next()) {');
        L.push('  return ' + v + ';');
        L.push('}');
        return L.join('\n');
      }
      var idParam = (s.fnParams || '').split(',')[0].trim() || 'sysId';
      if (op === 'get' && s.setWorkflow) {
        L.push(v + ".addQuery('sys_id', " + idParam + ');');
        L.push(v + '.setWorkflow(false);');
        L.push(v + '.query();');
        L.push('');
        L.push('if (' + v + '.next()) {');
        L.push('  return ' + v + ';');
        L.push('}');
        return L.join('\n');
      }
      L.push('if (' + v + '.get(' + idParam + ')) {');
      if (op === 'get') { L.push('  return ' + v + ';'); }
      if (op === 'updateSingle') {
        fieldSetLines(v, s.insertInputStyle, '  ', true).forEach(function (ln) { L.push(ln); });
        if (s.autoSysFields) { L.push('  ' + v + '.autoSysFields(false);'); }
        if (s.setWorkflow) { L.push('  ' + v + '.setWorkflow(false);'); }
        L.push('');
        L.push(s.withRefs ? '  return ' + v + '.updateWithReferences();' : '  return ' + v + '.update();');
      }
      if (op === 'deleteSingle') {
        if (s.setWorkflow) { L.push('  ' + v + '.setWorkflow(false);'); }
        L.push('  ' + v + '.deleteRecord();');
      }
      L.push('}');
      return L.join('\n');
    }

    var firstParam = (s.fnParams || '').split(',')[0].trim();
    if (firstParam) { L.push(v + '.addEncodedQuery(' + firstParam + ');'); }

    if (op === 'updateMultiple' && ma === 'bulk') {
      L.push('');
      fieldSetLines(v, s.insertInputStyle, '', false).forEach(function (ln) { L.push(ln); });
      if (s.setWorkflow) { L.push(v + '.setWorkflow(false);'); }
      if (s.autoSysFields) { L.push(v + '.autoSysFields(false);'); }
      L.push(v + '.updateMultiple();');
      return L.join('\n');
    }

    if (op === 'deleteMultiple' && ma === 'bulk') {
      if (s.setWorkflow) { L.push(v + '.setWorkflow(false);'); }
      L.push(v + '.deleteMultiple();');
      return L.join('\n');
    }

    var validOrderBys = (s.orderBys || []).filter(function (o) { return o.field.trim(); });
    validOrderBys.forEach(function (o) {
      L.push(v + '.' + (o.dir === 'desc' ? 'orderByDesc' : 'orderBy') + "('" + o.field.trim() + "');");
    });
    var usesChooseWindow = op === 'queryReturn' && s.useChooseWindow;
    if (s.useLimit && !usesChooseWindow) { L.push(v + '.setLimit(' + (parseInt(s.limit, 10) || 10) + ');'); }
    if (usesChooseWindow) {
      var firstP = sanitizeParamName(s.chooseWindowFirst, 'first');
      var lastP = sanitizeParamName(s.chooseWindowLast, 'last');
      L.push(v + '.chooseWindow(' + firstP + ', ' + lastP + ');');
    }
    if (s.setWorkflow) { L.push(v + '.setWorkflow(false);'); }
    if (s.autoSysFields && op === 'updateMultiple') { L.push(v + '.autoSysFields(false);'); }
    L.push(v + '.query();');
    L.push('');

    if (op === 'queryReturn') {
      L.push('return ' + v + ';');
      return L.join('\n');
    }

    L.push('while (' + v + '.next()) {');
    if (op === 'updateMultiple' && ma === 'loop') {
      fieldSetLines(v, s.insertInputStyle, '  ', true).forEach(function (ln) { L.push(ln); });
      L.push(s.withRefs ? '  ' + v + '.updateWithReferences();' : '  ' + v + '.update();');
    }
    if (op === 'deleteMultiple' && ma === 'loop') {
      L.push('  ' + v + '.deleteRecord();');
    }
    L.push('}');
    return L.join('\n');
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Minimal JS syntax highlighter for the output pane, ported verbatim from the original.
  function highlight(code) {
    var kw = { 'var': 1, 'new': 1, 'while': 1, 'if': 1, 'else': 1, 'for': 1, 'function': 1, 'return': 1, 'true': 1, 'false': 1, 'null': 1 };
    var out = '', i = 0;
    while (i < code.length) {
      var ch = code[i];
      if (ch === '/' && code[i + 1] === '*') {
        var j1 = i + 2;
        while (j1 < code.length && !(code[j1] === '*' && code[j1 + 1] === '/')) { j1++; }
        j1 += 2;
        out += '<span class="c-com">' + esc(code.slice(i, Math.min(j1, code.length))) + '</span>'; i = j1; continue;
      }
      if (ch === '/' && code[i + 1] === '/') {
        var j2 = i; while (j2 < code.length && code[j2] !== '\n') { j2++; }
        out += '<span class="c-com">' + esc(code.slice(i, j2)) + '</span>'; i = j2; continue;
      }
      if (ch === "'" || ch === '"') {
        var j3 = i + 1;
        while (j3 < code.length && code[j3] !== ch) { if (code[j3] === '\\') { j3++; } j3++; }
        j3++;
        out += '<span class="c-str">' + esc(code.slice(i, Math.min(j3, code.length))) + '</span>'; i = j3; continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        var j4 = i; while (j4 < code.length && /[A-Za-z0-9_$]/.test(code[j4])) { j4++; }
        var w = code.slice(i, j4);
        if (kw[w]) { out += '<span class="c-kw">' + w + '</span>'; }
        else if (code[j4] === '(') { out += '<span class="c-fn">' + esc(w) + '</span>'; }
        else { out += esc(w); }
        i = j4; continue;
      }
      if (/[0-9]/.test(ch)) {
        var j5 = i; while (j5 < code.length && /[0-9.]/.test(code[j5])) { j5++; }
        out += '<span class="c-num">' + code.slice(i, j5) + '</span>'; i = j5; continue;
      }
      out += esc(ch); i++;
    }
    return out;
  }

  return {
    fmtVal: fmtVal,
    sanitizeParamName: sanitizeParamName,
    camel: camel,
    cap: cap,
    camelFromLabel: camelFromLabel,
    varBaseFromTable: varBaseFromTable,
    deriveVar: deriveVar,
    deriveClass: deriveClass,
    deriveFnParams: deriveFnParams,
    deriveFnName: deriveFnName,
    wrapTryCatch: wrapTryCatch,
    wrapInFn: wrapInFn,
    fieldSetLines: fieldSetLines,
    genGlideRecord: genGlideRecord,
    highlight: highlight,
  };
}