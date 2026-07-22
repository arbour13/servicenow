/* "Example call" panel codegen - illustrative caller-side code shown alongside the main
   generated function, built from the "Example inputs" cards (never affects the generated
   function itself). Composes CodegenService (naming) + EncoderService (encodeGroups) +
   AggregateService (shape/naming) via DI rather than duplicating any of their logic. */
angular.module('glideStudio').factory('ExampleCallService', [
  'CodegenService', 'EncoderService', 'AggregateService', 'ScriptIncludeService',
  function (CodegenService, EncoderService, AggregateService, ScriptIncludeService) {
    'use strict';

    var SYS_ID_PLACEHOLDER = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    var QUERY_PLACEHOLDER = 'active=true^priority=1';

    function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
    function quoteExampleVal(val) { return "'" + esc(String((val || '').trim() || '...')) + "'"; }
    function objectLiteralKey(f) { return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(f) ? f : "'" + f.replace(/'/g, "\\'") + "'"; }

    // sets: [{field, value}], style: 'object' | 'array' (matches GlideRecord's insertInputStyle).
    function buildFieldsLiteral(sets, style) {
      var listed = (sets || []).filter(function (s) { return s.field.trim(); });
      if (style === 'array') {
        return listed.length
          ? '[\n' + listed.map(function (s) { return "  { name: '" + s.field.trim() + "', value: " + quoteExampleVal(s.value) + ' }'; }).join(',\n') + '\n]'
          : "[\n  // Add { name, value } pairs to set, e.g. { name: 'short_description', value: 'Broken printer' }\n]";
      }
      return listed.length
        ? '{\n' + listed.map(function (s) { return '  ' + objectLiteralKey(s.field.trim()) + ': ' + quoteExampleVal(s.value); }).join(',\n') + '\n}'
        : "{\n  // Add field/value pairs to set, e.g. short_description: 'Broken printer'\n}";
    }

    // Example call for GlideRecord's encodedQuery-driven operations (get-by-encodedQuery, Get
    // multiple, update/delete multiple). s: GlideRecord mode's full form state.
    function exampleQueryCall(s, tableLabels) {
      var built = EncoderService.encodeGroups(s.grArgGroups);
      var manual = (s.exampleQuery || '').trim();
      var query = built || manual || QUERY_PLACEHOLDER;
      var fn = (s.fnName || '').trim() || 'yourFunction';
      var paramNames = (s.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      var queryVar = paramNames[0] || 'encodedQuery';
      var lines = ['var ' + queryVar + " = '" + esc(query) + "';"];
      var numIdx = 0;
      paramNames.slice(1).forEach(function (p) {
        if (p === 'fields') { lines.push('var fields = ' + buildFieldsLiteral(s.sets, s.insertInputStyle) + ';'); }
        else { lines.push('var ' + p + ' = ' + (numIdx === 0 ? '0' : '100') + ';'); numIdx++; }
      });
      lines.push('');
      var callExpr = fn + '(' + (paramNames.length ? paramNames.join(', ') : queryVar) + ')';
      var v = (s.varName || '').trim() || CodegenService.deriveVar(s.table, 'Gr', tableLabels);
      if (s.operation === 'queryReturn') {
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('while (' + v + '.next()) {');
        lines.push('  // Each iteration is one matched record - read its fields, e.g. ' + v + ".getValue('field_name')");
        lines.push('}');
      } else if (s.operation === 'get') {
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + v + ') {');
        lines.push('  // Record found - read its fields, e.g. ' + v + ".getValue('field_name')");
        lines.push('}');
      } else {
        lines.push(callExpr + ';');
      }
      return lines.join('\n');
    }

    // Example call for GlideRecord's sys_id/fields-driven operations (get-by-sys_id, insert,
    // update, delete). Returns '' when the current operation takes neither.
    function exampleSysFieldsCall(s, tableLabels) {
      var op = s.operation;
      var fn = (s.fnName || '').trim() || 'createRecord';
      var paramNames = (s.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      var takesSysId = (op === 'get' && (s.getMethod || 'sysId') === 'sysId') || op === 'updateSingle' || op === 'deleteSingle';
      var takesFields = op === 'insert' || op === 'updateSingle';
      if (!takesSysId && !takesFields) { return ''; }

      var lines = [];
      var callArgs = [];
      if (takesSysId) {
        var idVar = paramNames[0] || 'sysId';
        var idVal = (s.exampleSysId || '').trim() || SYS_ID_PLACEHOLDER;
        lines.push('var ' + idVar + " = '" + esc(idVal) + "';");
        callArgs.push(idVar);
      }
      if (takesFields) {
        var fieldsVar = paramNames[callArgs.length] || 'fields';
        lines.push('var ' + fieldsVar + ' = ' + buildFieldsLiteral(s.sets, s.insertInputStyle) + ';');
        callArgs.push(fieldsVar);
      }
      lines.push('');
      var callExpr = fn + '(' + callArgs.join(', ') + ')';
      if (op === 'get') {
        var v = (s.varName || '').trim() || CodegenService.deriveVar(s.table, 'Gr', tableLabels);
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + v + ') {');
        lines.push('  // Record found - read its fields, e.g. ' + v + ".getValue('field_name')");
        lines.push('}');
      } else if (op === 'insert') {
        var idVar1 = (s.table || '').trim() ? CodegenService.deriveVar(s.table, 'Id', tableLabels) : 'sysId';
        lines.push('var ' + idVar1 + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + idVar1 + ') {');
        lines.push("  // Insert succeeded - " + idVar1 + " is the new record's sys_id");
        lines.push('}');
      } else if (op === 'updateSingle') {
        var idVar2 = (s.table || '').trim() ? CodegenService.deriveVar(s.table, 'Id', tableLabels) : 'sysId';
        lines.push('var ' + idVar2 + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + idVar2 + ') {');
        lines.push('  // Update succeeded');
        lines.push('}');
      } else {
        lines.push(callExpr + ';');
      }
      return lines.join('\n');
    }

    // Picks the right example-call producer for the current GlideRecord operation. '' means no
    // example panel should be shown.
    function buildExampleCall(s, tableLabels) {
      var gm = s.getMethod || 'sysId';
      var usesQueryArg = (s.operation === 'get' && gm === 'encodedQuery') || s.operation === 'queryReturn' || s.operation === 'updateMultiple' || s.operation === 'deleteMultiple';
      return usesQueryArg ? exampleQueryCall(s, tableLabels) : exampleSysFieldsCall(s, tableLabels);
    }

    // True when the example call declares a literal sys_id (get-by-sys_id, update, delete) -
    // used to show a "never hard-code sys_ids" warning next to that example panel.
    function exampleHasHardcodedSysId(s) {
      var op = s.operation;
      return (op === 'get' && (s.getMethod || 'sysId') === 'sysId') || op === 'updateSingle' || op === 'deleteSingle';
    }

    // Example call for GlideAggregate. aggS: GlideAggregate mode's full form state (needs an
    // extra `groups`/`gaExampleQuery` pair of "example inputs" fields alongside its real state).
    function buildAggExampleCall(aggS, tableLabels) {
      var built = EncoderService.encodeGroups(aggS.groups);
      var manual = (aggS.gaExampleQuery || '').trim();
      var query = built || manual || QUERY_PLACEHOLDER;
      var fn = (aggS.fnName || '').trim() || 'getCount';
      var paramNames = (aggS.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      var queryVar = paramNames[0] || 'encodedQuery';
      var lines = ['var ' + queryVar + " = '" + esc(query) + "';", ''];
      var callExpr = fn + '(' + (paramNames.length ? paramNames.join(', ') : queryVar) + ')';
      var word = AggregateService.aggNameWord(aggS);
      var resultVar = (aggS.table || '').trim() ? CodegenService.deriveVar(aggS.table, word, tableLabels) : word.toLowerCase();
      lines.push('var ' + resultVar + ' = ' + callExpr + ';');
      lines.push('');
      var shape = AggregateService.aggShape(aggS);
      if (shape === 'array') {
        lines.push(resultVar + '.forEach(function(row) {');
        lines.push('  // row.<field>/row.<aggregate> - use as needed');
        lines.push('});');
      } else if (shape === 'object') {
        lines.push('if (' + resultVar + ') {');
        lines.push('  // ' + resultVar + '.<aggregate> - use as needed');
        lines.push('}');
      } else {
        lines.push('if (' + resultVar + ' > 0) {');
        lines.push('  // Non-empty result - use ' + resultVar + ' as needed');
        lines.push('}');
      }
      return lines.join('\n');
    }

    // Example call for GlideAjax. Declares every function param except the callback (the last
    // one) with a placeholder value, then calls the function with an inline callback whose
    // parameter is named after the table - the shape of the parsed JSON payload. GlideAjax mode
    // has no `table` concept in this rebuild (see MainController's ajaxState comment), so the
    // result var falls back to 'result' - table is accepted for interface parity/future use.
    function buildAjaxExampleCall(ajaxS, table) {
      var fn = (ajaxS.fnName || '').trim() || 'callAjax';
      var paramNames = (ajaxS.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      var dataParams = paramNames.slice(0, -1);
      var lines = [];
      dataParams.forEach(function (p) {
        var val = /sys.?id/i.test(p) ? SYS_ID_PLACEHOLDER : 'value';
        lines.push('var ' + p + " = '" + esc(val) + "';");
      });
      if (dataParams.length) { lines.push(''); }
      var resultVar = (table || '').trim() ? CodegenService.camel(table) : 'result';
      lines.push(fn + '(' + dataParams.concat(['function (' + resultVar + ') {']).join(', '));
      lines.push('  if (' + resultVar + ') {');
      lines.push('    // ' + resultVar + '.<field> - use as needed');
      lines.push('  }');
      lines.push('});');
      return lines.join('\n');
    }

    // Example call for GlideQuery's encodedQuery-driven operations (get-by-encodedQuery, Get
    // multiple, Count, Update matching, Delete matching). s: GlideQuery mode's full form state.
    // queryReturn/update both return an already-materialized array (see GlideQueryService.
    // genGlideQuery's forEach comment) - .forEach() on the result is real Array.forEach, not a
    // Stream, so the example reads identically to any other array of records.
    function exampleGqQueryCall(s, tableLabels) {
      var built = EncoderService.encodeGroups(s.gqArgGroups);
      var manual = (s.exampleQuery || '').trim();
      var query = built || manual || QUERY_PLACEHOLDER;
      var fn = (s.fnName || '').trim() || 'yourFunction';
      var paramNames = (s.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      var queryVar = paramNames[0] || 'encodedQuery';
      var lines = ['var ' + queryVar + " = '" + esc(query) + "';"];
      paramNames.slice(1).forEach(function (p) {
        if (p === 'fields') { lines.push('var fields = ' + buildFieldsLiteral(s.sets, 'object') + ';'); }
      });
      lines.push('');
      var callExpr = fn + '(' + (paramNames.length ? paramNames.join(', ') : queryVar) + ')';
      var v = (s.gqVar || '').trim() || CodegenService.deriveVar(s.table, 'Gq', tableLabels);
      if (s.operation === 'queryReturn' || s.operation === 'update') {
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push(v + '.forEach(function (record) {');
        lines.push('  // Each entry is one matched record - a plain object narrowed to the fields you selected');
        lines.push('});');
      } else if (s.operation === 'count') {
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + v + ' > 0) {');
        lines.push('  // Non-empty result - use ' + v + ' as needed');
        lines.push('}');
      } else if (s.operation === 'get') {
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + v + ') {');
        lines.push('  // Record found - a plain object narrowed to the fields you selected, e.g. ' + v + '.number');
        lines.push('}');
      } else {
        lines.push(callExpr + ';');
      }
      return lines.join('\n');
    }

    // Example call for GlideQuery's sys_id/fields-driven operations (get-by-sys_id, insert).
    // Returns '' when the current operation takes neither.
    function exampleGqSysFieldsCall(s, tableLabels) {
      var op = s.operation;
      var fn = (s.fnName || '').trim() || 'yourFunction';
      var paramNames = (s.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      var takesSysId = op === 'get' && (s.getMethod || 'sysId') === 'sysId';
      var takesFields = op === 'insert';
      if (!takesSysId && !takesFields) { return ''; }

      var lines = [];
      var callArgs = [];
      if (takesSysId) {
        var idVar = paramNames[0] || 'sysId';
        var idVal = (s.exampleSysId || '').trim() || SYS_ID_PLACEHOLDER;
        lines.push('var ' + idVar + " = '" + esc(idVal) + "';");
        callArgs.push(idVar);
      }
      if (takesFields) {
        var fieldsVar = paramNames[callArgs.length] || 'fields';
        lines.push('var ' + fieldsVar + ' = ' + buildFieldsLiteral(s.sets, 'object') + ';');
        callArgs.push(fieldsVar);
      }
      lines.push('');
      var callExpr = fn + '(' + callArgs.join(', ') + ')';
      var v = (s.gqVar || '').trim() || CodegenService.deriveVar(s.table, 'Gq', tableLabels);
      if (op === 'get') {
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + v + ') {');
        lines.push('  // Record found - a plain object narrowed to the fields you selected, e.g. ' + v + '.number');
        lines.push('}');
      } else if (op === 'insert') {
        lines.push('var ' + v + ' = ' + callExpr + ';');
        lines.push('');
        lines.push('if (' + v + ') {');
        lines.push('  // Insert succeeded - a plain object narrowed to the fields you selected');
        lines.push('}');
      }
      return lines.join('\n');
    }

    // Picks the right example-call producer for the current GlideQuery operation.
    function buildGqExampleCall(s, tableLabels) {
      var gm = s.getMethod || 'sysId';
      var usesQueryArg = (s.operation === 'get' && gm === 'encodedQuery') ||
        ['queryReturn', 'count', 'update', 'deleteMultiple'].indexOf(s.operation) !== -1;
      return usesQueryArg ? exampleGqQueryCall(s, tableLabels) : exampleGqSysFieldsCall(s, tableLabels);
    }

    // True when the example call declares a literal sys_id (get-by-sys_id) - used to show a "never
    // hard-code sys_ids" warning next to that example panel.
    function gqExampleHasHardcodedSysId(s) {
      return s.operation === 'get' && (s.getMethod || 'sysId') === 'sysId';
    }

    // Example call for a client-callable Script Include - one GlideAjax block per enabled method,
    // matching the exact sysparm_* contract ScriptIncludeService's Ajax methods expect
    // (sysparm_name/sysparm_sys_id/sysparm_values/sysparm_query - see its own header comment).
    function buildSiAjaxExampleCall(siState) {
      var m = siState.methods || {};
      var cls = ScriptIncludeService.ajaxClassName(siState);
      var pascal = ScriptIncludeService.derivePascal(siState.table);
      var blocks = [];

      function block(methodName, extraParams, comment) {
        var lines = ["var ga = new GlideAjax('" + cls + "');", "ga.addParam('sysparm_name', '" + methodName + "');"];
        extraParams.forEach(function (p) { lines.push(p); });
        lines.push(
          'ga.getXMLAnswer(function(response) {',
          '  var result = JSON.parse(response);',
          '  // ' + comment,
          '});'
        );
        return lines.join('\n');
      }

      if (m.create && m.create.on) {
        var createsObj = m.create.returnType === 'gliderecord' || m.create.returnType === 'object';
        blocks.push(block('create' + pascal,
          ["ga.addParam('sysparm_values', JSON.stringify({ /* field: value */ }));"],
          createsObj ? 'result is the new record' : 'result is the new record sys_id'));
      }
      if (m.read && m.read.on) {
        blocks.push(block('get' + pascal,
          ["ga.addParam('sysparm_sys_id', '" + SYS_ID_PLACEHOLDER + "');"],
          'result is the record, or null if not found'));
      }
      if (m.list && m.list.on) {
        blocks.push(block('query' + pascal + 's',
          ["ga.addParam('sysparm_query', '" + QUERY_PLACEHOLDER + "');"],
          m.list.returnType === 'sysids' ? 'result is an array of sys_ids' : 'result is an array of records'));
      }
      if (m.update && m.update.on) {
        var updatesObj = m.update.returnType === 'gliderecord' || m.update.returnType === 'object';
        blocks.push(block('update' + pascal,
          ["ga.addParam('sysparm_sys_id', '" + SYS_ID_PLACEHOLDER + "');", "ga.addParam('sysparm_values', JSON.stringify({ /* field: value */ }));"],
          updatesObj ? 'result is the updated record' : 'result is the updated record sys_id'));
      }
      if (m.delete && m.delete.on) {
        blocks.push(block('delete' + pascal,
          ["ga.addParam('sysparm_sys_id', '" + SYS_ID_PLACEHOLDER + "');"],
          'result is true if the record was deleted'));
      }

      return blocks.join('\n\n');
    }

    // Example call for a server-only Script Include (siState.callable === 'server') - one plain
    // server-side call per enabled method, phrased the same way GlideRecord's own example-call
    // comments already are ("Record found - read its fields, e.g. ...", "Insert succeeded - ...")
    // so the two read the same across modes.
    function buildSiServerExampleCall(siState) {
      var m = siState.methods || {};
      var cls = (siState.className || 'RecordService').trim();
      var instanceVar = CodegenService.camel(cls);
      var pascal = ScriptIncludeService.derivePascal(siState.table);
      var blocks = [];

      if (m.create && m.create.on) {
        var createsObj = m.create.returnType === 'gliderecord' || m.create.returnType === 'object';
        blocks.push([
          'var values = { /* field: value */ };',
          'var ' + instanceVar + ' = new ' + cls + '();',
          'var result = ' + instanceVar + '.create' + pascal + '(values);',
          '',
          'if (result) {',
          '  // Insert succeeded - result is ' + (createsObj ? 'the new record' : "the new record's sys_id"),
          '}',
        ].join('\n'));
      }
      if (m.read && m.read.on) {
        var readsObj = m.read.returnType === 'object';
        blocks.push([
          "var sysId = '" + SYS_ID_PLACEHOLDER + "';",
          'var ' + instanceVar + ' = new ' + cls + '();',
          'var result = ' + instanceVar + '.get' + pascal + '(sysId);',
          '',
          'if (result) {',
          "  // Record found - read its fields, e.g. " + (readsObj ? 'result.field_name' : "result.getValue('field_name')"),
          '}',
        ].join('\n'));
      }
      if (m.list && m.list.on) {
        var rt = m.list.returnType || 'gliderecord';
        var lines = [
          "var encodedQuery = '" + QUERY_PLACEHOLDER + "';",
          'var ' + instanceVar + ' = new ' + cls + '();',
          'var result = ' + instanceVar + '.query' + pascal + 's(encodedQuery);',
          '',
        ];
        if (rt === 'gliderecord') {
          lines.push(
            'while (result.next()) {',
            "  // Each iteration is one matched record - read its fields, e.g. result.getValue('field_name')",
            '}'
          );
        } else {
          lines.push('// result is an array of ' + (rt === 'sysids' ? 'sys_ids' : 'records'));
        }
        blocks.push(lines.join('\n'));
      }
      if (m.update && m.update.on) {
        blocks.push([
          "var sysId = '" + SYS_ID_PLACEHOLDER + "';",
          'var values = { /* field: value */ };',
          'var ' + instanceVar + ' = new ' + cls + '();',
          'var result = ' + instanceVar + '.update' + pascal + '(sysId, values);',
          '',
          'if (result) {',
          '  // Update succeeded',
          '}',
        ].join('\n'));
      }
      if (m.delete && m.delete.on) {
        blocks.push([
          "var sysId = '" + SYS_ID_PLACEHOLDER + "';",
          'var ' + instanceVar + ' = new ' + cls + '();',
          'var deleted = ' + instanceVar + '.delete' + pascal + '(sysId);',
        ].join('\n'));
      }

      return blocks.join('\n\n');
    }

    // The one entry point main.controller.js calls - picks server vs. client-callable usage so
    // every Script Include gets an Example call panel, not just the client-callable ones.
    function buildSiExampleCall(siState) {
      if (!siState) { return ''; }
      return siState.callable === 'server' ? buildSiServerExampleCall(siState) : buildSiAjaxExampleCall(siState);
    }

    return {
      SYS_ID_PLACEHOLDER: SYS_ID_PLACEHOLDER,
      QUERY_PLACEHOLDER: QUERY_PLACEHOLDER,
      buildFieldsLiteral: buildFieldsLiteral,
      buildExampleCall: buildExampleCall,
      exampleHasHardcodedSysId: exampleHasHardcodedSysId,
      buildAggExampleCall: buildAggExampleCall,
      buildGqExampleCall: buildGqExampleCall,
      gqExampleHasHardcodedSysId: gqExampleHasHardcodedSysId,
      buildAjaxExampleCall: buildAjaxExampleCall,
      buildSiAjaxExampleCall: buildSiAjaxExampleCall,
      buildSiServerExampleCall: buildSiServerExampleCall,
      buildSiExampleCall: buildSiExampleCall,
    };
  }
]);
