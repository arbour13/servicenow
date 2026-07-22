/* GlideAjax codegen. Pure, same discipline as CodegenService/AggregateService - reuses
   CodegenService.camel via DI. */
angular.module('glideStudio').factory('AjaxService', ['CodegenService', function (CodegenService) {
  'use strict';

  // s: {ajaxVar, ajaxScriptInclude, ajaxMethod, ajaxParams: [{name,value}], fnParams, errorHandling}
  // Error handling is baked directly into the generated callback (try/catch around the caller's
  // callback invocation) - unlike GlideRecord/GlideAggregate, GlideAjax does NOT use the outer
  // wrapTryCatch() wrap, since the try/catch belongs inside the async callback, not around the
  // whole (synchronous, fire-and-forget) function body.
  function genGlideAjax(s) {
    var v = (s.ajaxVar || '').trim() || 'glideAjax';
    var si = (s.ajaxScriptInclude || 'ScriptInclude').trim();
    var method = (s.ajaxMethod || 'process').trim();
    var L = [];
    L.push('var ' + v + " = new GlideAjax('" + si + "');");
    L.push('');
    L.push(v + ".addParam('sysparm_name', '" + method + "');");
    (s.ajaxParams || []).filter(function (p) { return p.name.trim(); }).forEach(function (p) {
      var name = p.name.trim();
      if (name.indexOf('sysparm_') !== 0) { name = 'sysparm_' + name; }
      var val = p.value.trim() === '' ? "''" : p.value.trim();
      L.push(v + ".addParam('" + name + "', " + val + ');');
    });
    L.push('');
    var eh = s.errorHandling;
    // The last function parameter is the caller's callback - whatever it's named, that's what
    // receives the parsed response (default "sysId, callback", so "callback" unless renamed).
    var paramNames = (s.fnParams || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
    var callbackName = paramNames[paramNames.length - 1] || 'callback';
    L.push(v + '.getXMLAnswer(function (response) {');
    if (eh) {
      L.push('  try {');
      L.push('    ' + callbackName + '(response ? JSON.parse(response) : null);');
      L.push('');
      L.push('  } catch (e) {');
      L.push("    console.error('GlideAjax error: ' + e);");
      L.push('  }');
    } else {
      L.push('  ' + callbackName + '(response ? JSON.parse(response) : null);');
    }
    L.push('});');
    return L.join('\n');
  }

  function deriveAjaxFnName(ajaxMethod) {
    var method = (ajaxMethod || '').trim();
    return method ? CodegenService.camel(method) : 'callAjax';
  }
  // GlideAjax's parameters are always "<data params...>, callback" - fixed shape since the async
  // callback is structural, not configurable like GlideRecord's per-operation parameter list.
  function deriveAjaxFnParams() { return 'sysId, callback'; }
  function deriveAjaxVar(ajaxScriptInclude) {
    return CodegenService.camel(ajaxScriptInclude || 'record') + 'Ajax';
  }

  return {
    genGlideAjax: genGlideAjax,
    deriveAjaxFnName: deriveAjaxFnName,
    deriveAjaxFnParams: deriveAjaxFnParams,
    deriveAjaxVar: deriveAjaxVar,
  };
}]);
