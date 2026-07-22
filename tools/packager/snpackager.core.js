/* Shared core for packaging a single-page Angular tool (Glide Studio, Standards, ...) as a real
   ServiceNow scoped application Update Set: one sp_angular_provider per service/directive file,
   an sp_widget carrying the page's own template + controller, and the sp_page/container/row/
   column/instance/portal scaffold that hosts it. Extracted from Glide Studio's DeployService
   (the most advanced existing implementation) and Standards' build-deploy.js (the same logic,
   stripped down) - see Code/_tokens... no, see the workspace memory note for the extraction
   history. This file has NO I/O of its own (no fetch, no fs) so it runs unchanged in a browser
   (the live Deploy modal) and in Node (a static build script) - callers fetch source text
   however their environment allows and pass it in.

   STYLING STRATEGY: each widget's own <css> field is the SOLE styling carrier (no separate
   sp_css Include / m2m_sp_theme_css_include - deliberately dropped). scopeScss() is run over the
   app's ENTIRE authored SCSS source (not just its rules) and the result - $token: value !default;
   declarations AND the scoped rules, both copied through untouched by scopeScss's bare-statement
   handling - becomes that field verbatim. This makes every widget independently portable: dropped
   into a portal whose theme already defines a given $token (compiled ahead of the widget's own
   SCSS in ServiceNow's render pipeline), that definition wins and the widget's own !default is a
   no-op; dropped anywhere else, the widget's own bundled default applies. No Theme/Include has to
   travel with it for the widget to look right.

   SYS_IDS: rather than each app hand-maintaining a literal list of sys_id constants, every record
   this file creates is keyed off manifest.sysIdPrefix + a fixed semantic seed via stableSysId() -
   deterministic (same app, same rebuild -> same sys_id, so re-importing updates the existing
   records instead of duplicating them) and collision-free across apps as long as each app picks
   its own distinct sysIdPrefix, exactly like the two hand-written implementations this replaces. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SNPackager = root.SNPackager || {};
    root.SNPackager.core = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==================================================================================
     XML primitives
     ================================================================================== */

  function cdata(s) { return '<![CDATA[' + String(s == null ? '' : s).replace(/\]\]>/g, ']]]]><![CDATA[>') + ']]>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ==================================================================================
     Bracket-depth provider-body extraction - generic, app-agnostic: works on any
     angular.module('x').factory/directive/controller('Name', BODY) registration, skipping over
     string/comment/regex-literal content so parens embedded in generated-code string literals
     (these apps generate JS/SCSS as strings) don't throw off the depth count.
     ================================================================================== */

  var REGEX_PRECEDER_PUNCT = /[([{,;:=!&|?+\-*%^~<>]/;
  var REGEX_PRECEDER_KEYWORDS = /^(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield)$/;
  function findMatchingParen(src, openIdx) {
    var depth = 0, i = openIdx, len = src.length, inStr = null, inLineComment = false, inBlockComment = false;
    var lastToken = '(', wordBuf = ''; // '(' = "expression position" so a regex can start openIdx+1
    function flushWord() { if (wordBuf) { lastToken = wordBuf; wordBuf = ''; } }
    function regexAllowed() { return lastToken === '(' || REGEX_PRECEDER_PUNCT.test(lastToken) || REGEX_PRECEDER_KEYWORDS.test(lastToken); }
    for (; i < len; i++) {
      var ch = src[i];
      if (inLineComment) { if (ch === '\n') { inLineComment = false; } continue; }
      if (inBlockComment) { if (src[i - 1] === '*' && ch === '/') { inBlockComment = false; } continue; }
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === inStr) { inStr = null; lastToken = inStr; }
        continue;
      }
      if (ch === "'" || ch === '"') { flushWord(); inStr = ch; continue; }
      if (ch === '/' && src[i + 1] === '/') { flushWord(); inLineComment = true; i++; continue; }
      if (ch === '/' && src[i + 1] === '*') { flushWord(); inBlockComment = true; i++; continue; }
      if (ch === '/') {
        flushWord();
        if (regexAllowed()) {
          var j = i + 1, inClass = false;
          while (j < len) {
            if (src[j] === '\\') { j += 2; continue; }
            if (src[j] === '[') { inClass = true; j++; continue; }
            if (src[j] === ']') { inClass = false; j++; continue; }
            if (src[j] === '/' && !inClass) { break; }
            if (src[j] === '\n') { break; }
            j++;
          }
          j++; // past the closing '/'
          while (j < len && /[a-z]/i.test(src[j])) { j++; } // regex flags (g, i, m, ...)
          i = j - 1; // for-loop's i++ lands exactly after the regex
          lastToken = '/regex/';
          continue;
        }
        lastToken = '/';
        continue;
      }
      if (/[a-zA-Z0-9_$]/.test(ch)) { wordBuf += ch; continue; }
      flushWord();
      if (ch === '(') { depth++; lastToken = '('; }
      else if (ch === ')') { depth--; lastToken = ')'; if (depth === 0) { return i; } }
      else if (!/\s/.test(ch)) { lastToken = ch; }
    }
    return -1;
  }

  // Extracts the registration body (the function, or a ['dep', function(dep){}] DI array) passed
  // as the 2nd argument to angular.module(moduleName).<method>('Name', BODY) - i.e. everything
  // BODY covers, exactly as ServiceNow's Angular Provider `script` field expects it (SP registers
  // the provider itself from the name/type fields; the script is just the factory/directive
  // definition, not wrapped in an angular.module(...) call).
  function extractProviderBody(src, moduleName, method) {
    var marker = ".module('" + moduleName + "')." + method + '(';
    var start = src.indexOf(marker);
    if (start < 0) { throw new Error('Could not find ' + method + '() registration for module ' + moduleName + ' in source'); }
    var parenIdx = start + marker.length - 1; // index of the '(' itself
    var closeIdx = findMatchingParen(src, parenIdx);
    if (closeIdx < 0) { throw new Error('Unbalanced parens extracting ' + method + '() body'); }
    var inner = src.slice(parenIdx + 1, closeIdx).trim();
    // inner is `'Name', BODY` - drop the leading quoted name + comma.
    var nameMatch = inner.match(/^'[^']*'\s*,\s*/);
    if (!nameMatch) { throw new Error('Could not find provider name in ' + method + '() call'); }
    return inner.slice(nameMatch[0].length).trim();
  }

  // A controller authored with AngularJS's inline DI-array annotation
  // (['dep1', ..., function (dep1, ...) {...}]) survives minification; a ServiceNow widget's
  // Client controller field wants just the function (SP doesn't minify widget scripts, so the
  // param names alone still carry the injection once unwrapped).
  function unwrapDiArray(body) {
    var text = String(body || '').trim();
    if (text.charAt(0) !== '[') { return text; }
    var fnStart = text.indexOf('function');
    var lastBracket = text.lastIndexOf(']');
    if (fnStart < 0 || lastBracket < 0 || lastBracket <= fnStart) { return text; }
    return text.slice(fnStart, lastBracket).trim();
  }

  // Generalizes the one-off "this provider has a trailing top-level statement after its own
  // .directive()/.factory() call" quirk (e.g. Glide Studio's gs-select.directive.js registers a
  // shared document scroll listener below its directive registration). Real Angular Providers
  // have no "run block" to hang a standalone side effect off of, so a manifest entry can name a
  // marker string; everything from its LAST occurrence to end-of-file is appended to the
  // extracted provider body (folded into the widget's own client_script at assembly time, which
  // is equivalent in effect since there's only ever one instance of a given widget on a page).
  function extractTrailingMarker(src, marker) {
    if (!marker) { return ''; }
    var idx = src.lastIndexOf(marker);
    return idx < 0 ? '' : src.slice(idx);
  }

  /* ==================================================================================
     Widget template extraction - the AUTHORED `<div class="app">...</div>` from index.html's raw
     SOURCE, not a live/compiled DOM snapshot. A plain tag-depth text scan (not DOMParser) so this
     runs identically in Node and the browser: counts `<div`/`</div>` occurrences from the opening
     tag's position, which is enough because every other element on the page nests entirely inside
     that one div. Only `ng-controller` is stripped (a real SP widget's controller is wired by the
     widget record, not an inline directive in the template).
     ================================================================================== */

  function extractAppDiv(html) {
    var startMatch = html.match(/<div class="app"[^>]*>/);
    if (!startMatch) { throw new Error('Could not find <div class="app"> in index.html source'); }
    var start = startMatch.index;
    var i = start + startMatch[0].length;
    var depth = 1;
    var tagRe = /<div[ >]|<\/div>/g;
    tagRe.lastIndex = i;
    var m;
    while ((m = tagRe.exec(html))) {
      if (m[0] === '</div>') { depth--; } else { depth++; }
      if (depth === 0) { return html.slice(start, tagRe.lastIndex); }
    }
    throw new Error('Unbalanced <div> nesting looking for the end of <div class="app">');
  }
  function buildTemplateFromSource(indexHtml, scopeClass) {
    var appDiv = extractAppDiv(indexHtml).replace(/\s+ng-controller="[^"]*"/, '');
    return '<div class="' + scopeClass + '">\n' + appDiv + '\n</div>';
  }

  /* ==================================================================================
     Styling - scopeScss() re-scopes a stylesheet's SELECTORS under the widget's own wrapper class
     so it can never restyle the rest of the portal, operating on the raw SCSS SOURCE text (not
     the browser's CSSOM - `$token: value !default;` and `#{$token}` aren't valid CSS, so a
     CSSOM-based approach would silently drop every SCSS variable declaration/interpolation in the
     file). It walks the text at brace-depth 0: a run ending in '{' is a selector (gets prefixed),
     a run ending in ';' is a bare statement like `$token: value !default;` (left completely
     untouched - it isn't a selector). This is exactly what makes the "widget css only" strategy
     above work: running the FULL authored SCSS source through this once yields BOTH the !default
     token declarations and the scoped rules together, ready to drop straight into the widget's own
     <css> field. @media's body is recursed into (it contains nested selectors needing the same
     treatment); every other rule's body is copied verbatim.
     ================================================================================== */

  function scopeScss(text, scope) {
    function prefixSelector(sel) {
      return sel.split(',').map(function (raw) {
        var s = raw.trim();
        if (!s) { return s; }
        if (s === 'html' || s === 'body' || s === ':root' || s === 'html, body') { return scope; }
        if (s.indexOf(':root[') === 0) { return scope + s.slice(5); }
        if (s === '*') { return scope + ' *'; }
        if (s.indexOf('body ') === 0) { return scope + ' ' + s.slice(5); }
        if (s.indexOf('html ') === 0) { return scope + ' ' + s.slice(5); }
        return scope + ' ' + s;
      }).join(', ');
    }
    function findRuleEnd(src, openBraceIdx, end) {
      var depth = 1, j = openBraceIdx + 1, strc = null;
      while (j < end && depth > 0) {
        var cj = src[j];
        if (strc) {
          if (cj === '\\') { j += 2; continue; }
          if (cj === strc) { strc = null; }
          j++; continue;
        }
        // A comment INSIDE a rule body can itself contain apostrophes/quotes in ordinary prose -
        // skipping the whole comment atomically first keeps those from desyncing the quote
        // tracking below, which would otherwise corrupt the depth count and return the wrong '}'.
        if (cj === '/' && src[j + 1] === '*') {
          var cEnd = src.indexOf('*/', j + 2);
          j = cEnd < 0 ? end : cEnd + 2;
          continue;
        }
        if (cj === "'" || cj === '"') { strc = cj; j++; continue; }
        if (cj === '{') { depth++; }
        else if (cj === '}') { depth--; }
        j++;
      }
      return j - 1; // index of the matching '}'
    }
    function scanBlock(src, start, end) {
      var out = '', i = start, stmtStart = start, inStr = null;
      while (i < end) {
        var ch = src[i];
        // String-tracking here only stops a quoted '{'/';' (e.g. a selector like
        // [data-foo="a;b"]) from being mistaken for a real boundary - it never writes to `out`
        // itself; every character reaches `out` only via the src.slice(stmtStart, i) calls below.
        if (inStr) {
          if (ch === '\\') { i += 2; continue; }
          if (ch === inStr) { inStr = null; }
          i++; continue;
        }
        if (ch === "'" || ch === '"') { inStr = ch; i++; continue; }
        if (ch === '/' && src[i + 1] === '*') {
          var close = src.indexOf('*/', i + 2);
          var blockEnd = close < 0 ? end : close + 2;
          out += src.slice(i, blockEnd);
          i = blockEnd; stmtStart = i; continue;
        }
        if (ch === '/' && src[i + 1] === '/') {
          var nl = src.indexOf('\n', i);
          var lineEnd = nl < 0 ? end : nl;
          out += src.slice(i, lineEnd);
          i = lineEnd; stmtStart = i; continue;
        }
        if (ch === '{') {
          var selector = src.slice(stmtStart, i).trim();
          var bodyEnd = findRuleEnd(src, i, end);
          if (/^@media/.test(selector)) {
            out += selector + ' {' + scanBlock(src, i + 1, bodyEnd) + '}';
          } else {
            out += prefixSelector(selector) + ' {' + src.slice(i + 1, bodyEnd) + '}';
          }
          i = bodyEnd + 1;
          stmtStart = i;
          continue;
        }
        if (ch === ';') {
          out += src.slice(stmtStart, i + 1); // bare statement (e.g. `$token: value !default;`)
          i++;
          stmtStart = i;
          continue;
        }
        i++;
      }
      out += src.slice(stmtStart, end);
      return out;
    }
    return scanBlock(text, 0, text.length);
  }

  // Utility, not on the assembleXml critical path: pulls just the light/default palette's
  // `$<tokenPrefix>-*` declarations out of an SCSS source (e.g. for a "these are this widget's
  // defaults" preview). `-dark`-suffixed ones are excluded - those are an app's own runtime
  // light/dark toggle (CSS custom properties), not this compile-time SCSS token system.
  function extractDefaultVariables(scssText, tokenPrefix) {
    var withoutComments = scssText.replace(/\/\*[\s\S]*?\*\//g, '');
    var re = new RegExp('\\$' + tokenPrefix + '-([a-z0-9-]+):\\s*([^;]+?)\\s*!default;', 'g');
    var lines = [], m;
    while ((m = re.exec(withoutComments))) {
      if (/-dark$/.test(m[1])) { continue; }
      lines.push('$' + tokenPrefix + '-' + m[1] + ': ' + m[2] + ';');
    }
    return lines.join('\n');
  }

  /* ==================================================================================
     Sys_id derivation - deterministic per (sysIdPrefix, seed), so a NEW app never has to
     hand-maintain a literal list of sys_id constants; see this file's header comment.

     manifest.sysIds is an ESCAPE HATCH for apps migrating onto this core that may already be
     imported into a live instance under hand-picked literal sys_ids (this core's predecessors -
     Glide Studio's deploy.service.js, Standards' build-deploy.js - assigned APP_SYS_ID/
     WIDGET_SYS_ID/etc as arbitrary literals, not derived from anything). Any key present in
     manifest.sysIds wins verbatim over the derived default, so a migrating app can pin its exact
     existing ids and keep updating the SAME records on re-import instead of creating duplicates.
     A brand-new app can omit sysIds entirely and get everything derived for free.
     ================================================================================== */

  function stableSysId(sysIdPrefix, seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) { h = ((h << 5) - h + seed.charCodeAt(i)) | 0; }
    var hex = (h >>> 0).toString(16);
    while (hex.length < 8) { hex = '0' + hex; }
    return sysIdPrefix + hex + '00112233';
  }

  var ACL_TABLES = ['sp_theme', 'sp_page', 'sp_container', 'sp_row', 'sp_column', 'sp_widget', 'sp_instance', 'sp_portal'];

  function deriveSysIds(manifest) {
    var p = manifest.sysIdPrefix;
    var ids = {
      app: stableSysId(p, 'app'),
      theme: stableSysId(p, 'theme'),
      portal: stableSysId(p, 'portal'),
      page: stableSysId(p, 'page'),
      container: stableSysId(p, 'container'),
      row: stableSysId(p, 'row'),
      column: stableSysId(p, 'column'),
      widget: stableSysId(p, 'widget'),
      instance: stableSysId(p, 'instance'),
    };
    if (manifest.features && manifest.features.roles) {
      ids.userRole = stableSysId(p, 'user_role');
      ids.adminRole = stableSysId(p, 'admin_role');
      ids.userGroup = stableSysId(p, 'user_group');
      ids.adminGroup = stableSysId(p, 'admin_group');
      ids.userGroupRole = stableSysId(p, 'user_group_role');
      ids.adminGroupRole = stableSysId(p, 'admin_group_role');
    }
    var overrides = manifest.sysIds || {};
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) { ids[key] = overrides[key]; }
    }
    return ids;
  }

  /* ==================================================================================
     Scope helpers (pure). Live-instance prefix DETECTION (a network call) stays host-owned - see
     manifest.schema.md - but deriving/validating a scope string from an app name + company code
     needs no I/O and is identical for every host.
     ================================================================================== */

  var SCOPE_MAX = 18; // ServiceNow caps a full application scope (x_<companycode>_<appname>) at 18 chars.
  function scopeSlug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'app';
  }
  function deriveScope(appName, companyCode) {
    var code = String(companyCode || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var prefix = 'x_' + (code ? code + '_' : '');
    var room = Math.max(1, SCOPE_MAX - prefix.length);
    var appId = scopeSlug(appName).slice(0, room).replace(/_+$/, '') || scopeSlug(appName).slice(0, room) || 'app';
    return (prefix + appId).slice(0, SCOPE_MAX);
  }
  function deriveVendorPrefix(scope) {
    return String(scope || '').split('_').slice(0, 2).join('_');
  }

  /* ==================================================================================
     Pure assembly: given already-fetched source text, extract every piece a package needs.
     No fetch/fs here - hosts read their sources however their environment allows and pass the
     text in. `opts.formatFn`, if given, runs over every extracted script body (e.g. js-beautify
     in a browser host); defaults to identity.
     ================================================================================== */

  function buildParts(manifest, sources, opts) {
    var formatFn = (opts && opts.formatFn) || function (s) { return s; };
    var moduleName = manifest.angularModuleName;

    var providers = (manifest.providers || []).map(function (p) {
      var src = sources.providerSrcs[p.file];
      if (src == null) { throw new Error('No source provided for provider file ' + p.file); }
      var body = extractProviderBody(src, moduleName, p.type === 'directive' ? 'directive' : 'factory');
      if (p.trailingMarker) { body += '\n\n' + extractTrailingMarker(src, p.trailingMarker); }
      return { name: p.name, type: p.type, file: p.file, script: formatFn(body) };
    });

    var controllerFn = unwrapDiArray(extractProviderBody(sources.controllerSrc, moduleName, 'controller'));
    var clientScript = formatFn('api.controller = ' + controllerFn + ';');

    var serverScript = formatFn(sources.serverScript ||
      '(function() {\n  /* No server-side data needed - this widget\'s logic lives entirely in its injected Angular services. */\n})();');

    var template = buildTemplateFromSource(sources.indexHtml, manifest.widgetScopeClass);
    // Shared SCSS partials (e.g. tools/theme-foundation/_tokens.scss) are inlined at the TOP of the
    // widget's own <css>, before the app's rules - the host reads the files named in
    // manifest.sharedScssPartials and passes their concatenated text as sources.sharedScss. Because
    // they're `!default` token declarations (bare statements), scopeScss passes them through
    // untouched; the app's rules that reference those tokens compile against them. This is what gives
    // every widget the shared token vocabulary + portal portability. See manifest.schema.md.
    var scssSrc = (sources.sharedScss ? sources.sharedScss + '\n\n' : '') + sources.scssSrc;
    var css = scopeScss(scssSrc, '.' + manifest.widgetScopeClass);

    return { providers: providers, clientScript: clientScript, serverScript: serverScript, template: template, css: css, link: sources.link || '' };
  }

  /* ==================================================================================
     Record builders - one pure function per ServiceNow artifact this package writes. Every
     record is INSERT_OR_UPDATE against its derived sys_id, tagged with the same sys_scope, so
     re-running the build against the same manifest updates the existing records instead of
     duplicating them.
     ================================================================================== */

  function buildAppRecord(manifest, ids, scopeTag) {
    return [
      '<sys_app action="INSERT_OR_UPDATE">',
      '<active>true</active>',
      '<name>' + esc(manifest.appName) + '</name>',
      '<private>true</private>',
      '<scope>' + esc(manifest.scope) + '</scope>',
      '<short_description>' + esc(manifest.shortDescription || manifest.appName) + '</short_description>',
      '<sys_id>' + ids.app + '</sys_id>',
      scopeTag,
      '<sys_update_name>sys_app_' + ids.app + '</sys_update_name>',
      '<trackable>true</trackable>',
      '<vendor_prefix>' + esc(manifest.vendorPrefix || deriveVendorPrefix(manifest.scope)) + '</vendor_prefix>',
      '<version>' + esc(manifest.version || '1.0.0') + '</version>',
      '</sys_app>',
    ].join('\n');
  }

  // No css_variables of its own - see this file's header comment. Still emitted because sp_portal
  // requires a <theme> reference; this is just the portal-scaffold theme, not the token carrier.
  function buildThemeRecord(manifest, ids, scopeTag) {
    return [
      '<sp_theme action="INSERT_OR_UPDATE">',
      '<css_variables/>',
      '<name>' + esc(manifest.appName) + ' Theme</name>',
      '<navbar_fixed>true</navbar_fixed>',
      '<sys_id>' + ids.theme + '</sys_id>',
      '<sys_name>' + esc(manifest.appName) + ' Theme</sys_name>',
      scopeTag,
      '<sys_update_name>sp_theme_' + ids.theme + '</sys_update_name>',
      '</sp_theme>',
    ].join('\n');
  }


  function buildProviderRecord(p, script, sysId, scopeTag) {
    return [
      '<sp_angular_provider action="INSERT_OR_UPDATE">',
      '<active>true</active>',
      '<name>' + esc(p.name) + '</name>',
      '<type>' + p.type + '</type>',
      '<script>' + cdata(script) + '</script>',
      '<sys_id>' + sysId + '</sys_id>',
      '<sys_name>' + esc(p.name) + '</sys_name>',
      scopeTag,
      '<sys_update_name>sp_angular_provider_' + sysId + '</sys_update_name>',
      '</sp_angular_provider>',
    ].join('\n');
  }

  // An empty factory registered under a dev-harness-only service's name, so a controller that
  // still injects it (guarded behind an ng-if the deployed widget never satisfies) resolves at
  // instantiation instead of throwing "Unknown provider: ...".
  function buildStubProviderRecord(moduleName, name, sysId, scopeTag) {
    var stub = "angular.module('" + moduleName + "').factory('" + name + "', [function () {\n" +
      "  /* Dev-harness-only stub - the real " + name + " ships only in the dev harness. */\n" +
      "  return {};\n}]);";
    return buildProviderRecord({ name: name, type: 'service' }, stub, sysId, scopeTag);
  }

  function buildWidgetRecord(manifest, ids, parts, scopeTag) {
    var widgetId = manifest.scope + '_widget';
    return [
      '<sp_widget action="INSERT_OR_UPDATE">',
      '<category>custom</category>',
      '<client_script>' + cdata(parts.clientScript) + '</client_script>',
      '<controller_as>vm</controller_as>',
      '<css>' + cdata(parts.css) + '</css>',
      '<demo_data/>',
      '<description>' + esc(manifest.shortDescription || manifest.appName) + '</description>',
      '<has_preview>true</has_preview>',
      '<id>' + widgetId + '</id>',
      '<internal>false</internal>',
      '<link>' + cdata(parts.link) + '</link>',
      '<name>' + esc(manifest.appName) + '</name>',
      '<option_schema/>',
      '<public>false</public>',
      '<roles/>',
      '<script>' + cdata(parts.serverScript) + '</script>',
      '<servicenow>false</servicenow>',
      '<sys_class_name>sp_widget</sys_class_name>',
      '<sys_id>' + ids.widget + '</sys_id>',
      '<sys_name>' + esc(manifest.appName) + '</sys_name>',
      scopeTag,
      '<sys_update_name>sp_widget_' + ids.widget + '</sys_update_name>',
      '<template>' + cdata(parts.template) + '</template>',
      '</sp_widget>',
    ].join('\n');
  }

  // <roles> on the page is what actually gates it (server-side, before the page ever renders); a
  // manifest without features.roles ships this blank, same as before.
  function buildPageTreeRecords(manifest, ids, scopeTag) {
    var pageId = manifest.scope + '_page';
    var pageRolesTag = (manifest.features && manifest.features.roles) ? ids.userRole : '';
    var pageRec = [
      '<sp_page action="INSERT_OR_UPDATE">',
      '<category>custom</category>',
      '<id>' + pageId + '</id>',
      '<internal>false</internal>',
      '<roles>' + pageRolesTag + '</roles>',
      '<short_description>' + esc(manifest.appName) + ' page</short_description>',
      '<sys_id>' + ids.page + '</sys_id>',
      '<sys_name>' + esc(manifest.appName) + '</sys_name>',
      scopeTag,
      '<sys_update_name>sp_page_' + ids.page + '</sys_update_name>',
      '<title>' + esc(manifest.appName) + '</title>',
      '</sp_page>',
    ].join('\n');
    var containerRec = [
      '<sp_container action="INSERT_OR_UPDATE">',
      '<bootstrap_alt>false</bootstrap_alt>',
      '<name>' + esc(manifest.appName) + '</name>',
      '<order>100</order>',
      '<sp_page>' + ids.page + '</sp_page>',
      '<sys_id>' + ids.container + '</sys_id>',
      scopeTag,
      '<sys_update_name>sp_container_' + ids.container + '</sys_update_name>',
      '<width>container-fluid</width>',
      '</sp_container>',
    ].join('\n');
    var rowRec = [
      '<sp_row action="INSERT_OR_UPDATE">',
      '<order>100</order>',
      '<sp_container>' + ids.container + '</sp_container>',
      '<sys_id>' + ids.row + '</sys_id>',
      scopeTag,
      '<sys_update_name>sp_row_' + ids.row + '</sys_update_name>',
      '</sp_row>',
    ].join('\n');
    var columnRec = [
      '<sp_column action="INSERT_OR_UPDATE">',
      '<order>100</order>',
      '<size>12</size>',
      '<sp_row>' + ids.row + '</sp_row>',
      '<sys_id>' + ids.column + '</sys_id>',
      scopeTag,
      '<sys_update_name>sp_column_' + ids.column + '</sys_update_name>',
      '</sp_column>',
    ].join('\n');
    return { pageRec: pageRec, containerRec: containerRec, rowRec: rowRec, columnRec: columnRec };
  }

  function buildInstanceRecord(manifest, ids, scopeTag) {
    return [
      '<sp_instance action="INSERT_OR_UPDATE">',
      '<order>100</order>',
      '<sp_column>' + ids.column + '</sp_column>',
      '<sp_widget>' + ids.widget + '</sp_widget>',
      '<sys_class_name>sp_instance</sys_class_name>',
      '<sys_id>' + ids.instance + '</sys_id>',
      '<sys_name>' + esc(manifest.appName) + '</sys_name>',
      scopeTag,
      '<sys_update_name>sp_instance_' + ids.instance + '</sys_update_name>',
      '<title>' + esc(manifest.appName) + '</title>',
      '</sp_instance>',
    ].join('\n');
  }

  function buildPortalRecord(manifest, ids, scopeTag) {
    return [
      '<sp_portal action="INSERT_OR_UPDATE">',
      '<default>false</default>',
      '<homepage>' + ids.page + '</homepage>',
      '<sys_id>' + ids.portal + '</sys_id>',
      '<sys_name>' + esc(manifest.appName) + '</sys_name>',
      scopeTag,
      '<sys_update_name>sp_portal_' + ids.portal + '</sys_update_name>',
      '<theme>' + ids.theme + '</theme>',
      '<title>' + esc(manifest.appName) + '</title>',
      '<url_suffix>' + esc(manifest.urlSuffix) + '</url_suffix>',
      '</sp_portal>',
    ].join('\n');
  }

  /* ---------------------------- opt-in roles/groups/ACL layer ---------------------------- */

  function buildRoleRecord(name, sysId, description, scopeTag) {
    return [
      '<sys_user_role action="INSERT_OR_UPDATE">',
      '<active>true</active>',
      '<description>' + esc(description) + '</description>',
      '<name>' + esc(name) + '</name>',
      '<sys_id>' + sysId + '</sys_id>',
      '<sys_name>' + esc(name) + '</sys_name>',
      scopeTag,
      '<sys_update_name>sys_user_role_' + sysId + '</sys_update_name>',
      '</sys_user_role>',
    ].join('\n');
  }
  function buildGroupRecord(name, sysId, description, scopeTag) {
    return [
      '<sys_user_group action="INSERT_OR_UPDATE">',
      '<active>true</active>',
      '<description>' + esc(description) + '</description>',
      '<name>' + esc(name) + '</name>',
      '<sys_id>' + sysId + '</sys_id>',
      '<sys_name>' + esc(name) + '</sys_name>',
      scopeTag,
      '<sys_update_name>sys_user_group_' + sysId + '</sys_update_name>',
      '</sys_user_group>',
    ].join('\n');
  }
  function buildGroupRoleRecord(sysId, groupSysId, roleSysId, scopeTag) {
    return [
      '<sys_group_has_role action="INSERT_OR_UPDATE">',
      '<group>' + groupSysId + '</group>',
      '<role>' + roleSysId + '</role>',
      '<sys_id>' + sysId + '</sys_id>',
      scopeTag,
      '<sys_update_name>sys_group_has_role_' + sysId + '</sys_update_name>',
      '</sys_group_has_role>',
    ].join('\n');
  }
  // Scoped to just this app's own records via a `sys_scope=` condition, so this grant can't reach
  // another scoped app's records on the same table. Additive alongside whatever ACL(s) the target
  // instance already has on these tables - matching ACLs at the same table+operation are OR'd.
  function buildAclRecord(table, sysId, appSysId, adminRoleName, scopeTag) {
    return [
      '<sys_security_acl action="INSERT_OR_UPDATE">',
      '<active>true</active>',
      '<admin_overrides>false</admin_overrides>',
      '<condition>sys_scope=' + appSysId + '</condition>',
      '<description>Lets ' + esc(adminRoleName) + ' edit ' + table + ' records that belong to this application.</description>',
      '<name>' + table + '</name>',
      '<operation>write</operation>',
      '<sys_id>' + sysId + '</sys_id>',
      '<sys_name>' + table + '.write</sys_name>',
      scopeTag,
      '<sys_update_name>sys_security_acl_' + sysId + '</sys_update_name>',
      '<type>record</type>',
      '</sys_security_acl>',
    ].join('\n');
  }
  function buildAclRoleRecord(sysId, aclSysId, roleSysId, scopeTag) {
    return [
      '<sys_security_acl_role action="INSERT_OR_UPDATE">',
      '<sys_security_acl>' + aclSysId + '</sys_security_acl>',
      '<sys_user_role>' + roleSysId + '</sys_user_role>',
      '<sys_id>' + sysId + '</sys_id>',
      scopeTag,
      '<sys_update_name>sys_security_acl_role_' + sysId + '</sys_update_name>',
      '</sys_security_acl_role>',
    ].join('\n');
  }

  function buildRolesLayer(manifest, ids, scopeTag) {
    var r = manifest.roles;
    var userRoleRec = buildRoleRecord(r.userRoleName, ids.userRole, r.userRoleDescription || ('Can view and use the ' + manifest.appName + ' tool.'), scopeTag);
    var adminRoleRec = buildRoleRecord(r.adminRoleName, ids.adminRole, r.adminRoleDescription || ("Can edit " + manifest.appName + "'s own application records (widget, page, theme, layout)."), scopeTag);
    var userGroupRec = buildGroupRecord(r.userGroupName, ids.userGroup, r.userGroupDescription || ('Members can view and use the ' + manifest.appName + ' tool.'), scopeTag);
    var adminGroupRec = buildGroupRecord(r.adminGroupName, ids.adminGroup, r.adminGroupDescription || ('Members can edit the ' + manifest.appName + ' application.'), scopeTag);
    var userGroupRoleRec = buildGroupRoleRecord(ids.userGroupRole, ids.userGroup, ids.userRole, scopeTag);
    var adminGroupRoleRec = buildGroupRoleRecord(ids.adminGroupRole, ids.adminGroup, ids.adminRole, scopeTag);
    var aclRecs = ACL_TABLES.map(function (t) { return buildAclRecord(t, stableSysId(manifest.sysIdPrefix, t + ':acl'), ids.app, r.adminRoleName, scopeTag); });
    var aclRoleRecs = ACL_TABLES.map(function (t) { return buildAclRoleRecord(stableSysId(manifest.sysIdPrefix, t + ':acl_role'), stableSysId(manifest.sysIdPrefix, t + ':acl'), ids.adminRole, scopeTag); });
    return {
      before: [userRoleRec, adminRoleRec, userGroupRec, adminGroupRec, userGroupRoleRec, adminGroupRoleRec],
      after: aclRecs.concat(aclRoleRecs),
    };
  }

  /* ==================================================================================
     Top-level assembly. `opts.stamp` is required - this file never calls Date() itself (so the
     same manifest + same parts always produce byte-identical XML unless a host deliberately wants
     a fresh wall-clock stamp).
     ================================================================================== */

  function assembleXml(manifest, parts, opts) {
    var ids = deriveSysIds(manifest);
    var stamp = (opts && opts.stamp) || '';
    var scopeTag = '<sys_scope display_value="' + esc(manifest.appName).replace(/"/g, '&quot;') + '">' + ids.app + '</sys_scope>';

    var providerRecs = parts.providers.map(function (p) {
      return buildProviderRecord(p, p.script, stableSysId(manifest.sysIdPrefix, p.name), scopeTag);
    }).concat((manifest.stubProviders || []).map(function (name) {
      return buildStubProviderRecord(manifest.angularModuleName, name, stableSysId(manifest.sysIdPrefix, name), scopeTag);
    }));

    var pageTree = buildPageTreeRecords(manifest, ids, scopeTag);
    var appRec = buildAppRecord(manifest, ids, scopeTag);
    var themeRec = buildThemeRecord(manifest, ids, scopeTag);
    var widgetRec = buildWidgetRecord(manifest, ids, parts, scopeTag);
    var instanceRec = buildInstanceRecord(manifest, ids, scopeTag);
    var portalRec = buildPortalRecord(manifest, ids, scopeTag);

    var rolesLayer = (manifest.features && manifest.features.roles) ? buildRolesLayer(manifest, ids, scopeTag) : { before: [], after: [] };

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<unload unload_date="' + esc(stamp) + '">',
      appRec,
    ].concat(rolesLayer.before).concat([
      themeRec,
      pageTree.pageRec,
      pageTree.containerRec,
      pageTree.rowRec,
      pageTree.columnRec,
    ]).concat(providerRecs).concat([
      widgetRec,
      instanceRec,
      portalRec,
    ]).concat(rolesLayer.after).concat([
      '</unload>',
    ]).join('\n');
  }

  return {
    // XML primitives
    cdata: cdata, esc: esc,
    // extraction
    findMatchingParen: findMatchingParen, extractProviderBody: extractProviderBody,
    unwrapDiArray: unwrapDiArray, extractTrailingMarker: extractTrailingMarker,
    buildTemplateFromSource: buildTemplateFromSource, extractAppDiv: extractAppDiv,
    // styling
    scopeScss: scopeScss, extractDefaultVariables: extractDefaultVariables,
    // sys_id / scope
    stableSysId: stableSysId, deriveSysIds: deriveSysIds,
    deriveScope: deriveScope, scopeSlug: scopeSlug, deriveVendorPrefix: deriveVendorPrefix, SCOPE_MAX: SCOPE_MAX,
    // assembly
    buildParts: buildParts, assembleXml: assembleXml,
    // individual record builders (exposed for hosts that want to inspect/override a single piece)
    buildAppRecord: buildAppRecord, buildThemeRecord: buildThemeRecord, buildProviderRecord: buildProviderRecord,
    buildStubProviderRecord: buildStubProviderRecord, buildWidgetRecord: buildWidgetRecord,
    buildPageTreeRecords: buildPageTreeRecords, buildInstanceRecord: buildInstanceRecord, buildPortalRecord: buildPortalRecord,
    ACL_TABLES: ACL_TABLES,
  };
});
