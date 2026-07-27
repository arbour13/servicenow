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
    root.SNDeploymentPackager = root.SNDeploymentPackager || {};
    root.SNDeploymentPackager.core = factory();
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

     A real ServiceNow sys_id is ALWAYS exactly 32 hex characters (it's a GUID column on every
     table). stableSysId fills sysIdPrefix out to exactly 32 chars total with deterministic hash
     digits - never fewer, never a fixed literal tail (a previous version padded with a constant
     '00112233' suffix and stopped at 26 total for a 10-char prefix; both the short length and the
     zero-entropy padding are fixed here). Multiple independent hash rounds (each seeded with the
     previous round's index) are concatenated rather than repeating one 8-hex-digit hash, so two
     different seeds under the same prefix don't start colliding once truncated to fit.

     manifest.sysIds is an ESCAPE HATCH for apps migrating onto this core that may already be
     imported into a live instance under hand-picked literal sys_ids (this core's predecessors -
     Glide Studio's deploy.service.js, Standards' build-deploy.js - assigned APP_SYS_ID/
     WIDGET_SYS_ID/etc as arbitrary literals, not derived from anything). Any key present in
     manifest.sysIds wins verbatim over the derived default, so a migrating app can pin its exact
     existing ids and keep updating the SAME records on re-import instead of creating duplicates.
     A brand-new app can omit sysIds entirely and get everything derived for free.
     ================================================================================== */

  function stableSysId(sysIdPrefix, seed) {
    var needed = 32 - sysIdPrefix.length;
    var hex = '', round = 0;
    while (hex.length < needed) {
      var h = 0, s = seed + ':' + round;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
      var chunk = (h >>> 0).toString(16);
      while (chunk.length < 8) { chunk = '0' + chunk; }
      hex += chunk;
      round++;
    }
    return (sysIdPrefix + hex).slice(0, 32);
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
  // Just the "x_<companycode>_" portion - a starting point the user finishes typing themselves, NOT
  // a full scope. A Deploy UI should offer this (not deriveScope() below) when it has no record of
  // an app already installed under some specific scope on the target instance - guessing a full
  // scope from whatever text happens to be in an "App name" field produces a DIFFERENT scope than
  // last time the moment that text changes, which silently creates a second app instead of updating
  // the first. Detecting an existing install's real scope (see instance.js's getInstalledApp) and
  // holding it fixed across redeploys is the only case where a full scope should be auto-set.
  function deriveScopePrefix(companyCode) {
    var code = String(companyCode || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return 'x_' + (code ? code + '_' : '');
  }
  // Combines a scope prefix with a slugged app name into one full scope. Kept for a caller that
  // genuinely wants a fresh, one-shot scope suggestion (e.g. a first-ever deploy with no target
  // instance to check against yet) - the standalone deploy console itself no longer calls this on
  // every "App name" keystroke, for the reason in deriveScopePrefix's comment above.
  function deriveScope(appName, companyCode) {
    var prefix = deriveScopePrefix(companyCode);
    var room = Math.max(1, SCOPE_MAX - prefix.length);
    var appId = scopeSlug(appName).slice(0, room).replace(/_+$/, '') || scopeSlug(appName).slice(0, room) || 'app';
    return (prefix + appId).slice(0, SCOPE_MAX);
  }
  function deriveVendorPrefix(scope) {
    return String(scope || '').split('_').slice(0, 2).join('_');
  }
  // Suggests a next version after finding an already-installed app - bumps the patch component of
  // an "x.y.z" version. Anything else (a version string that isn't three dot-separated integers) is
  // returned UNCHANGED rather than guessed at - a caller/host still shows it, but leaves deciding
  // the next version to whoever's driving the redeploy.
  function bumpPatchVersion(version) {
    var parts = String(version || '').split('.');
    if (parts.length !== 3 || !parts.every(function (p) { return /^\d+$/.test(p); })) { return version; }
    return parts[0] + '.' + parts[1] + '.' + (parseInt(parts[2], 10) + 1);
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
    // Shared SCSS partials (e.g. a design-token file an app opts into) are inlined at the TOP of the
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
     Shared record model - the ONE place that knows which records + fields make up a package.
     buildRecordModel() returns an ORDERED array of plain records: { table, sysId, key, fields }.
     Each field is { name, value } (business data), plus one of three markers: `cdata: true` (a
     long script/template/css body - CDATA-wrapped for XML, externalized to its own file for
     Fluent), `empty: true` (a self-closing tag with no value, e.g. <demo_data/>), or `scopeTag:
     true` (the <sys_scope> tag itself - XML-only bookkeeping). `xmlOnly: true` marks bookkeeping
     fields (sys_id/sys_name/sys_scope/sys_update_name/sys_class_name) that only the XML emitter
     needs - Fluent derives identity from Now.ID/generated/keys.ts instead, and never repeats a
     record's own sys_id inside its data. `key` is the Now.ID key a Fluent emitter uses for this
     record; it's meaningless to XML.

     Both assembleXml() (below) and fluent.js's assembleFluent() build this SAME model
     and then just walk it their own way - so a new field on, say, sp_container is added in
     exactly one place (here) and both output formats pick it up automatically. Field ORDER is
     preserved deliberately (it matches a real ServiceNow Update Set export's per-table field
     order, which is not simple alphabetical - see e.g. sp_angular_provider's type-before-script)
     so XML output stays byte-identical to what this core produced before the model existed.
     ================================================================================== */

  function buildRecordModel(manifest, parts) {
    var ids = deriveSysIds(manifest);
    var scopeTag = '<sys_scope display_value="' + esc(manifest.appName).replace(/"/g, '&quot;') + '">' + ids.app + '</sys_scope>';
    var SC = { name: 'sys_scope', scopeTag: true, xmlOnly: true }; // reusable <sys_scope> sentinel
    var records = [];

    records.push({ table: 'sys_app', sysId: ids.app, key: 'app', fields: [
      { name: 'active', value: true },
      { name: 'name', value: manifest.appName },
      // Public, not private: a private scoped app can't be published to a ServiceNow Application
      // Repository at all (that's a prerequisite the platform enforces, not just a default) - since
      // that's the whole point of a real "install this in other instances like a true application"
      // path, this ships public from the start rather than something you'd have to remember to flip.
      { name: 'private', value: false },
      { name: 'scope', value: manifest.scope },
      { name: 'short_description', value: manifest.shortDescription || manifest.appName },
      { name: 'sys_id', value: ids.app, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sys_app_' + ids.app, xmlOnly: true },
      { name: 'trackable', value: true },
      { name: 'vendor_prefix', value: manifest.vendorPrefix || deriveVendorPrefix(manifest.scope) },
      { name: 'version', value: manifest.version || '1.0.0' },
    ] });

    // Opt-in roles/groups layer - BEFORE the theme/page/provider/widget records (matches the
    // original assembleXml's concatenation order).
    if (manifest.features && manifest.features.roles) {
      var r = manifest.roles;
      records.push({ table: 'sys_user_role', sysId: ids.userRole, key: 'userRole', fields: [
        { name: 'active', value: true },
        { name: 'description', value: r.userRoleDescription || ('Can view and use the ' + manifest.appName + ' tool.') },
        { name: 'name', value: r.userRoleName },
        { name: 'sys_id', value: ids.userRole, xmlOnly: true },
        { name: 'sys_name', value: r.userRoleName, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_user_role_' + ids.userRole, xmlOnly: true },
      ] });
      records.push({ table: 'sys_user_role', sysId: ids.adminRole, key: 'adminRole', fields: [
        { name: 'active', value: true },
        { name: 'description', value: r.adminRoleDescription || ("Can edit " + manifest.appName + "'s own application records (widget, page, theme, layout).") },
        { name: 'name', value: r.adminRoleName },
        { name: 'sys_id', value: ids.adminRole, xmlOnly: true },
        { name: 'sys_name', value: r.adminRoleName, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_user_role_' + ids.adminRole, xmlOnly: true },
      ] });
      records.push({ table: 'sys_user_group', sysId: ids.userGroup, key: 'userGroup', fields: [
        { name: 'active', value: true },
        { name: 'description', value: r.userGroupDescription || ('Members can view and use the ' + manifest.appName + ' tool.') },
        { name: 'name', value: r.userGroupName },
        { name: 'sys_id', value: ids.userGroup, xmlOnly: true },
        { name: 'sys_name', value: r.userGroupName, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_user_group_' + ids.userGroup, xmlOnly: true },
      ] });
      records.push({ table: 'sys_user_group', sysId: ids.adminGroup, key: 'adminGroup', fields: [
        { name: 'active', value: true },
        { name: 'description', value: r.adminGroupDescription || ('Members can edit the ' + manifest.appName + ' application.') },
        { name: 'name', value: r.adminGroupName },
        { name: 'sys_id', value: ids.adminGroup, xmlOnly: true },
        { name: 'sys_name', value: r.adminGroupName, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_user_group_' + ids.adminGroup, xmlOnly: true },
      ] });
      records.push({ table: 'sys_group_has_role', sysId: ids.userGroupRole, key: 'userGroupRole', fields: [
        { name: 'group', value: ids.userGroup },
        { name: 'role', value: ids.userRole },
        { name: 'sys_id', value: ids.userGroupRole, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_group_has_role_' + ids.userGroupRole, xmlOnly: true },
      ] });
      records.push({ table: 'sys_group_has_role', sysId: ids.adminGroupRole, key: 'adminGroupRole', fields: [
        { name: 'group', value: ids.adminGroup },
        { name: 'role', value: ids.adminRole },
        { name: 'sys_id', value: ids.adminGroupRole, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_group_has_role_' + ids.adminGroupRole, xmlOnly: true },
      ] });
    }

    // No css_variables of its own - see this file's header comment. Still emitted because
    // sp_portal requires a <theme> reference; this is just the portal-scaffold theme, not the
    // token carrier.
    records.push({ table: 'sp_theme', sysId: ids.theme, key: 'theme', fields: [
      { name: 'css_variables', empty: true },
      { name: 'name', value: manifest.appName + ' Theme' },
      { name: 'navbar_fixed', value: true },
      { name: 'sys_id', value: ids.theme, xmlOnly: true },
      { name: 'sys_name', value: manifest.appName + ' Theme', xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_theme_' + ids.theme, xmlOnly: true },
    ] });

    // Page tree. <roles> on the page is what actually gates it (server-side, before the page ever
    // renders); a manifest without features.roles ships this blank, same as before.
    var pageId = manifest.scope + '_page';
    var pageRolesTag = (manifest.features && manifest.features.roles) ? ids.userRole : '';
    records.push({ table: 'sp_page', sysId: ids.page, key: 'page', fields: [
      { name: 'category', value: 'custom' },
      { name: 'id', value: pageId },
      { name: 'internal', value: false },
      { name: 'roles', value: pageRolesTag },
      { name: 'short_description', value: manifest.appName + ' page' },
      { name: 'sys_id', value: ids.page, xmlOnly: true },
      { name: 'sys_name', value: manifest.appName, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_page_' + ids.page, xmlOnly: true },
      { name: 'title', value: manifest.appName },
    ] });
    records.push({ table: 'sp_container', sysId: ids.container, key: 'container', fields: [
      { name: 'bootstrap_alt', value: 'false' },
      { name: 'name', value: manifest.appName },
      { name: 'order', value: '100' },
      { name: 'sp_page', value: ids.page },
      { name: 'sys_id', value: ids.container, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_container_' + ids.container, xmlOnly: true },
      { name: 'width', value: 'container-fluid' },
    ] });
    records.push({ table: 'sp_row', sysId: ids.row, key: 'row', fields: [
      { name: 'order', value: '100' },
      { name: 'sp_container', value: ids.container },
      { name: 'sys_id', value: ids.row, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_row_' + ids.row, xmlOnly: true },
    ] });
    records.push({ table: 'sp_column', sysId: ids.column, key: 'column', fields: [
      { name: 'order', value: '100' },
      { name: 'size', value: '12' },
      { name: 'sp_row', value: ids.row },
      { name: 'sys_id', value: ids.column, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_column_' + ids.column, xmlOnly: true },
    ] });

    // Angular providers - one per manifest.providers entry, using the ALREADY-EXTRACTED/formatted
    // script from parts.providers (buildParts ran extraction earlier). Then dev-harness-only stub
    // providers (empty factories) - see the original buildStubProviderRecord's doc comment for why
    // these exist: a controller still injects them behind an ng-if the deployed widget never
    // satisfies, so the injector needs a real registration to resolve.
    (parts.providers || []).forEach(function (p) {
      var sysId = stableSysId(manifest.sysIdPrefix, p.name);
      records.push({ table: 'sp_angular_provider', sysId: sysId, key: p.name, fields: [
        { name: 'active', value: true },
        { name: 'name', value: p.name },
        { name: 'type', value: p.type },
        { name: 'script', value: p.script, cdata: true },
        { name: 'sys_id', value: sysId, xmlOnly: true },
        { name: 'sys_name', value: p.name, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sp_angular_provider_' + sysId, xmlOnly: true },
      ] });
    });
    (manifest.stubProviders || []).forEach(function (name) {
      var sysId = stableSysId(manifest.sysIdPrefix, name);
      // Body-only, matching every real provider's `script` field convention (extractProviderBody
      // strips the angular.module(...).factory(...) wrapper for those - SP registers the record
      // from its own name/type fields, so `script` is just the factory definition itself).
      var stub = "[function () {\n" +
        "  /* Dev-harness-only stub - the real " + name + " ships only in the dev harness. */\n" +
        "  return {};\n}]";
      records.push({ table: 'sp_angular_provider', sysId: sysId, key: name, fields: [
        { name: 'active', value: true },
        { name: 'name', value: name },
        { name: 'type', value: 'service' },
        { name: 'script', value: stub, cdata: true },
        { name: 'sys_id', value: sysId, xmlOnly: true },
        { name: 'sys_name', value: name, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sp_angular_provider_' + sysId, xmlOnly: true },
      ] });
    });

    // The widget.
    var widgetId = manifest.scope + '_widget';
    records.push({ table: 'sp_widget', sysId: ids.widget, key: 'widget', fields: [
      { name: 'category', value: 'custom' },
      { name: 'client_script', value: parts.clientScript, cdata: true },
      { name: 'controller_as', value: 'vm' },
      { name: 'css', value: parts.css, cdata: true },
      { name: 'demo_data', empty: true },
      { name: 'description', value: manifest.shortDescription || manifest.appName },
      { name: 'has_preview', value: true },
      { name: 'id', value: widgetId },
      { name: 'internal', value: false },
      { name: 'link', value: parts.link || '', cdata: true },
      { name: 'name', value: manifest.appName },
      { name: 'option_schema', empty: true },
      { name: 'public', value: false },
      { name: 'roles', empty: true },
      { name: 'script', value: parts.serverScript, cdata: true },
      { name: 'servicenow', value: false },
      { name: 'sys_class_name', value: 'sp_widget', xmlOnly: true },
      { name: 'sys_id', value: ids.widget, xmlOnly: true },
      { name: 'sys_name', value: manifest.appName, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_widget_' + ids.widget, xmlOnly: true },
      { name: 'template', value: parts.template, cdata: true },
    ] });

    records.push({ table: 'sp_instance', sysId: ids.instance, key: 'instance', fields: [
      { name: 'order', value: 100 },
      { name: 'sp_column', value: ids.column },
      { name: 'sp_widget', value: ids.widget },
      { name: 'sys_class_name', value: 'sp_instance', xmlOnly: true },
      { name: 'sys_id', value: ids.instance, xmlOnly: true },
      { name: 'sys_name', value: manifest.appName, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_instance_' + ids.instance, xmlOnly: true },
      { name: 'title', value: manifest.appName },
    ] });

    records.push({ table: 'sp_portal', sysId: ids.portal, key: 'portal', fields: [
      { name: 'default', value: false },
      { name: 'homepage', value: ids.page },
      { name: 'sys_id', value: ids.portal, xmlOnly: true },
      { name: 'sys_name', value: manifest.appName, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_portal_' + ids.portal, xmlOnly: true },
      { name: 'theme', value: ids.theme },
      { name: 'title', value: manifest.appName },
      { name: 'url_suffix', value: manifest.urlSuffix },
    ] });

    // Opt-in ACL layer - AFTER everything else (matches the original's non-interleaved order:
    // every table's ACL record first, then every table's ACL-role record). Scoped to just this
    // app's own records via a `sys_scope=` condition, so this grant can't reach another scoped
    // app's records on the same table - additive alongside whatever ACL(s) the target instance
    // already has (matching ACLs at the same table+operation are OR'd).
    if (manifest.features && manifest.features.roles) {
      var r2 = manifest.roles;
      ACL_TABLES.forEach(function (t) {
        var aclId = stableSysId(manifest.sysIdPrefix, t + ':acl');
        records.push({ table: 'sys_security_acl', sysId: aclId, key: 'acl_' + t, fields: [
          { name: 'active', value: true },
          { name: 'admin_overrides', value: false },
          { name: 'condition', value: 'sys_scope=' + ids.app },
          { name: 'description', value: 'Lets ' + r2.adminRoleName + ' edit ' + t + ' records that belong to this application.' },
          { name: 'name', value: t },
          { name: 'operation', value: 'write' },
          { name: 'sys_id', value: aclId, xmlOnly: true },
          { name: 'sys_name', value: t + '.write', xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_security_acl_' + aclId, xmlOnly: true },
          { name: 'type', value: 'record' },
        ] });
      });
      ACL_TABLES.forEach(function (t) {
        var aclId = stableSysId(manifest.sysIdPrefix, t + ':acl');
        var aclRoleId = stableSysId(manifest.sysIdPrefix, t + ':acl_role');
        records.push({ table: 'sys_security_acl_role', sysId: aclRoleId, key: 'acl_role_' + t, fields: [
          { name: 'sys_security_acl', value: aclId },
          { name: 'sys_user_role', value: ids.adminRole },
          { name: 'sys_id', value: aclRoleId, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_security_acl_role_' + aclRoleId, xmlOnly: true },
        ] });
      });
    }

    return { ids: ids, scopeTag: scopeTag, records: records };
  }

  // Renders one record as an XML block: CDATA-wraps `cdata` fields, self-closes `empty` fields,
  // inserts the record model's precomputed <sys_scope> tag for `scopeTag` fields, drops in a
  // caller-precomputed tag verbatim for `rawTag` fields (same idea as scopeTag, for a reference
  // field that isn't this record's own scope - see wrapAsUpdateSet's `remote_update_set` field),
  // and esc()'s everything else. Field ORDER comes straight from the model, so this reproduces
  // exactly what the old per-table builder functions emitted.
  function renderXmlRecord(rec, scopeTag) {
    var lines = ['<' + rec.table + ' action="INSERT_OR_UPDATE">'];
    rec.fields.forEach(function (f) {
      if (f.scopeTag) { lines.push(scopeTag); return; }
      if (f.rawTag) { lines.push(f.rawTag); return; }
      if (f.empty) { lines.push('<' + f.name + '/>'); return; }
      var content = f.cdata ? cdata(f.value) : esc(f.value);
      lines.push('<' + f.name + '>' + content + '</' + f.name + '>');
    });
    lines.push('</' + rec.table + '>');
    return lines.join('\n');
  }

  /* ==================================================================================
     Retrieved Update Set wrapping - XML-ONLY, applied by assembleXml() below, never touched by
     fluent.js (Fluent installs straight into an instance via the Now SDK; there is no Update Set
     concept there at all). buildRecordModel()'s output above is a flat list of the actual records
     a package needs (sp_widget, sys_app, ...) - that is exactly what a plain per-table XML export
     looks like, and it is NOT what ServiceNow's Retrieved Update Set importer (System Update Sets >
     Retrieved Update Sets > Import Update Set from XML) parses. That importer looks specifically
     for ONE `sys_remote_update_set` header record plus one `sys_update_xml` WRAPPER record per
     customization, where the actual record's own XML is escaped inside the wrapper's `payload`
     field. Without this wrapping, importing the plain record list finds nothing to do.
     ================================================================================== */

  // Cosmetic label shown in ServiceNow's own Retrieved Update Set preview list (the `type` column).
  // Not load-bearing - the platform acts on `source_table` and `payload`, not this text - but worth
  // getting close to what a real export would show.
  var UPDATE_XML_TYPE_LABELS = {
    sys_app: 'Application', sys_user_role: 'User Role', sys_user_group: 'Group',
    sys_group_has_role: 'Group has Role', sp_theme: 'Theme', sp_page: 'Page',
    sp_container: 'Container', sp_row: 'Row', sp_column: 'Column',
    sp_angular_provider: 'Angular Provider', sp_widget: 'Widget', sp_instance: 'Widget Instance',
    sp_portal: 'Portal', sys_security_acl: 'Access Control', sys_security_acl_role: 'Access Control Role',
  };

  // A human-readable identifier for the wrapper's `target_name` field. Most records already carry
  // an xmlOnly `sys_name` (added to the model specifically as a display identifier) or a real
  // `name` field; the handful that carry neither (sp_row, sp_column, sys_group_has_role,
  // sys_security_acl_role - pure structural/junction records with no name of their own) fall back
  // to the app name plus this record's own model key.
  function recordTargetName(rec, manifest) {
    var sysName = rec.fields.filter(function (f) { return f.name === 'sys_name'; })[0];
    if (sysName) { return sysName.value; }
    var name = rec.fields.filter(function (f) { return f.name === 'name'; })[0];
    if (name) { return name.value; }
    return manifest.appName + ' (' + rec.key + ')';
  }

  // Wraps every record from buildRecordModel() into the shape described above. Returns an ordered
  // array starting with the sys_remote_update_set header, followed by one sys_update_xml per
  // original record (same relative order buildRecordModel produced them in).
  function wrapAsUpdateSet(manifest, model) {
    var setSysId = stableSysId(manifest.sysIdPrefix, 'remote_update_set');
    var setName = manifest.appName + ' v' + (manifest.version || '1.0.0');
    var setTag = '<remote_update_set display_value="' + esc(setName).replace(/"/g, '&quot;') + '">' + setSysId + '</remote_update_set>';

    var header = { table: 'sys_remote_update_set', sysId: setSysId, key: 'remoteUpdateSet', fields: [
      { name: 'application', value: model.ids.app },
      { name: 'application_name', value: manifest.appName },
      { name: 'description', empty: true },
      { name: 'name', value: setName },
      // origin_sys_id/remote_sys_id normally identify this set on the instance it was RETRIEVED
      // from; this set has no such originating instance (it's generated directly, not retrieved
      // from a live dev instance), so both self-reference this same record's own sys_id.
      { name: 'origin_sys_id', value: setSysId },
      { name: 'remote_sys_id', value: setSysId },
      { name: 'state', value: 'complete' },
      { name: 'sys_id', value: setSysId, xmlOnly: true },
      { name: 'sys_update_name', value: 'sys_remote_update_set_' + setSysId, xmlOnly: true },
      { name: 'update_source', empty: true },
    ] };

    var wrapped = model.records.map(function (rec) {
      var payload = '<record_update table="' + rec.table + '">\n' + renderXmlRecord(rec, model.scopeTag) + '\n</record_update>';
      var wrapId = stableSysId(manifest.sysIdPrefix, 'update_xml:' + rec.key);
      return { table: 'sys_update_xml', sysId: wrapId, key: 'updateXml_' + rec.key, fields: [
        { name: 'action', value: 'INSERT_OR_UPDATE' },
        { name: 'application', value: model.ids.app },
        { name: 'category', value: 'customer' },
        { name: 'comments', empty: true },
        { name: 'name', value: rec.table + '_' + rec.sysId },
        { name: 'payload', value: payload, cdata: true },
        { name: 'remote_update_set', rawTag: setTag },
        { name: 'replace_on_upgrade', value: false },
        { name: 'source_table', value: rec.table },
        { name: 'sys_id', value: wrapId, xmlOnly: true },
        { name: 'sys_update_name', value: 'sys_update_xml_' + wrapId, xmlOnly: true },
        { name: 'target_name', value: recordTargetName(rec, manifest) },
        { name: 'type', value: UPDATE_XML_TYPE_LABELS[rec.table] || rec.table },
        { name: 'update_set', empty: true },
      ] };
    });

    return [header].concat(wrapped);
  }

  /* ==================================================================================
     Top-level XML assembly. `opts.stamp` is required - this file never calls Date() itself (so
     the same manifest + same parts always produce byte-identical XML unless a host deliberately
     wants a fresh wall-clock stamp). Output is wrapped as a real Retrieved Update Set (see
     wrapAsUpdateSet's header comment) - buildRecordModel()'s own flat record list is never emitted
     directly; that's what fluent.js's assembleFluent consumes instead, unwrapped.
     ================================================================================== */

  function assembleXml(manifest, parts, opts) {
    var stamp = (opts && opts.stamp) || '';
    var model = buildRecordModel(manifest, parts);
    var body = wrapAsUpdateSet(manifest, model).map(function (r) { return renderXmlRecord(r, model.scopeTag); });
    return ['<?xml version="1.0" encoding="UTF-8"?>', '<unload unload_date="' + esc(stamp) + '">']
      .concat(body).concat(['</unload>']).join('\n');
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
    deriveScope: deriveScope, deriveScopePrefix: deriveScopePrefix, bumpPatchVersion: bumpPatchVersion,
    scopeSlug: scopeSlug, deriveVendorPrefix: deriveVendorPrefix, SCOPE_MAX: SCOPE_MAX,
    // assembly - buildRecordModel is the shared source of truth both assembleXml (below) and
    // fluent.js's assembleFluent consume; renderXmlRecord is exposed for hosts that
    // want to inspect/override a single record's XML.
    buildParts: buildParts, buildRecordModel: buildRecordModel, renderXmlRecord: renderXmlRecord, assembleXml: assembleXml,
    ACL_TABLES: ACL_TABLES,
  };
});
