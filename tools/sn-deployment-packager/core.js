/* Shared core for packaging a single-page Angular tool (Glide Studio, Standards, Delivery
   Methodology, ...) as a ServiceNow scoped application Fluent / Now SDK project: one
   sp_angular_provider per service/directive file, an sp_widget carrying the page's own template +
   controller, and the sp_page/container/row/column/instance scaffold that hosts it. This file has
   NO I/O of its own (no fetch, no fs) so it runs unchanged in a browser (the deploy console) and in
   Node (build.js) - callers fetch source text however their environment allows and pass it in.

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
  // Inline harness ng-include view partials into the widget template. Service Portal ships one
  // template field and cannot fetch apps/<app>/partials/*.html at runtime. sources.viewPartials
  // is a map of basename (no .html) → file text; omitted/empty is a no-op for apps without partials.
  function inlineViewPartials(html, viewPartials) {
    if (!viewPartials) {
      return html;
    }
    // Harness uses Angular's ng-include="'partials/name.html'" (quoted expression).
    return html.replace(
      /<div([^>]*?)\s+ng-include=(["'])'partials\/([A-Za-z0-9_-]+)\.html'\2([^>]*)>\s*<\/div>/g,
      function (match, beforeAttrs, quote, name, afterAttrs) {
        var body = viewPartials[name];
        if (body == null) {
          throw new Error('Missing view partial for ng-include partials/' + name + '.html');
        }
        var attrs = (beforeAttrs + afterAttrs).replace(/\s+/g, ' ').trim();
        return '<div ' + attrs + '>\n' + String(body).replace(/^\n/, '').replace(/\n$/, '') + '\n      </div>';
      }
    );
  }

  function buildTemplateFromSource(indexHtml, scopeClass, viewPartials) {
    var inlined = inlineViewPartials(indexHtml, viewPartials || null);
    var appDiv = extractAppDiv(inlined).replace(/\s+ng-controller="[^"]*"/, '');
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

  // Service Portal compiles the widget <css> field as SCSS (older libsass). Modern CSS that
  // libsass tries to evaluate — rgba(var(--rgb), a), color-mix(...), calc(… / var(…)),
  // min(560px, 100%) — fails the compile and the widget ships with no styles. Wrap those
  // calls in #{'…'} so Sass emits them as literal CSS. Plain rgba(0,0,0,.25) / calc(1px + 2px)
  // are left alone (Sass handles them).
  function sassSafeCss(text) {
    function wrapLiteral(call) {
      return '#{\'' + String(call).replace(/\\/g, '\\\\').replace(/'/g, '\\\'') + '\'}';
    }
    function replaceFn(src, name, shouldWrap) {
      var out = '', i = 0, needle = name + '(';
      while (i < src.length) {
        var idx = src.indexOf(needle, i);
        if (idx < 0) { out += src.slice(i); break; }
        // Word boundary: don't match `rgb` inside `rgba`, `max` inside `minmax`, etc.
        var prev = idx === 0 ? '' : src[idx - 1];
        if (prev && /[A-Za-z0-9_-]/.test(prev)) {
          out += src.slice(i, idx + 1);
          i = idx + 1;
          continue;
        }
        out += src.slice(i, idx);
        var open = idx + needle.length - 1;
        var depth = 0, j = open;
        for (; j < src.length; j++) {
          if (src[j] === '(') { depth++; }
          else if (src[j] === ')') {
            depth--;
            if (depth === 0) { j++; break; }
          }
        }
        var call = src.slice(idx, j);
        out += shouldWrap(call) ? wrapLiteral(call) : call;
        i = j;
      }
      return out;
    }
    function wrapIfVarOrColorSpace(call) {
      return /\bvar\s*\(|\bin\s+srgb\b|\bin\s+lab\b|\bin\s+oklab\b/.test(call);
    }
    // Order matters: longer/more-specific names first where one is a prefix of another.
    text = replaceFn(text, 'rgba', wrapIfVarOrColorSpace);
    text = replaceFn(text, 'rgb', wrapIfVarOrColorSpace);
    text = replaceFn(text, 'color-mix', function () { return true; });
    text = replaceFn(text, 'calc', function (call) {
      return /[/*]|\bvar\s*\(/.test(call);
    });
    text = replaceFn(text, 'clamp', function () { return true; });
    text = replaceFn(text, 'minmax', function () { return true; });
    text = replaceFn(text, 'min', function () { return true; });
    text = replaceFn(text, 'max', function () { return true; });
    return text;
  }

  // Utility: pulls just the light/default palette's
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

  // features.theme / features.portal default ON (omitted = true). Set false to ship a widget+page
  // package that drops into an existing portal instead of scaffolding its own.
  function featureOn(manifest, name) {
    return !(manifest.features && manifest.features[name] === false);
  }

  function hasEditorRole(manifest) {
    return !!(manifest.features && manifest.features.roles &&
      manifest.roles && manifest.roles.editorRoleName);
  }

  // Short table name (e.g. "content") → full scoped name (e.g. "x_dlvry_method_content").
  // If the manifest already passed a fully-scoped name, leave it alone.
  function fullTableName(scope, shortName) {
    var s = String(shortName || '').trim();
    var sc = String(scope || '').trim();
    if (!s) { return s; }
    if (sc && (s === sc || s.indexOf(sc + '_') === 0)) { return s; }
    return sc ? (sc + '_' + s) : s;
  }

  // Normalize manifest.tables[] into the structural model Fluent emits as Table().
  // Column `reference` values that match another table's short name (or this table's) resolve to
  // the full scoped table name. Apps with no tables[] get [].
  function buildTablesModel(manifest) {
    var list = Array.isArray(manifest.tables) ? manifest.tables : [];
    var scope = manifest.scope || '';
    var shortToFull = {};
    list.forEach(function (t) {
      var shortName = String(t.name || '').trim();
      if (!shortName) { return; }
      shortToFull[shortName] = fullTableName(scope, shortName);
    });
    return list.map(function (t) {
      var shortName = String(t.name || '').trim();
      var fullName = shortToFull[shortName] || fullTableName(scope, shortName);
      var columns = (t.columns || []).map(function (col) {
        var out = {
          name: col.name,
          type: col.type,
          label: col.label || col.name,
        };
        if (col.maxLength != null) { out.maxLength = col.maxLength; }
        if (col.mandatory) { out.mandatory = true; }
        if (col.choices) { out.choices = col.choices; }
        if (col.cascadeRule) { out.cascadeRule = col.cascadeRule; }
        if (col.type === 'reference') {
          var ref = String(col.reference || '').trim();
          out.referenceTable = shortToFull[ref] || fullTableName(scope, ref) || ref;
        }
        return out;
      });
      return {
        shortName: shortName,
        name: fullName,
        label: t.label || shortName,
        columns: columns,
      };
    }).filter(function (t) { return !!t.shortName; });
  }

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
    };
    // Multi-widget apps (manifest.widgets[]) get one widget/instance sys_id pair PER declared
    // widget, seeded by that widget's own `id` slug - ids.widget/ids.instance (singular) are
    // omitted in this case rather than pointing at the first widget, so a caller that still reads
    // the old singular keys fails loudly instead of silently only ever touching one widget.
    if (Array.isArray(manifest.widgets) && manifest.widgets.length) {
      ids.widgets = {};
      manifest.widgets.forEach(function (w) {
        ids.widgets[w.id] = {
          widget: stableSysId(p, 'widget_' + w.id),
          instance: stableSysId(p, 'instance_' + w.id),
        };
      });
    } else {
      ids.widget = stableSysId(p, 'widget');
      ids.instance = stableSysId(p, 'instance');
    }
    if (manifest.features && manifest.features.roles) {
      ids.userRole = stableSysId(p, 'user_role');
      ids.adminRole = stableSysId(p, 'admin_role');
      ids.userGroup = stableSysId(p, 'user_group');
      ids.adminGroup = stableSysId(p, 'admin_group');
      ids.userGroupRole = stableSysId(p, 'user_group_role');
      ids.adminGroupRole = stableSysId(p, 'admin_group_role');
      // Optional third role (editor) - only when roles.editorRoleName is set.
      if (hasEditorRole(manifest)) {
        ids.editorRole = stableSysId(p, 'editor_role');
        ids.editorGroup = stableSysId(p, 'editor_group');
        ids.editorGroupRole = stableSysId(p, 'editor_group_role');
        ids.editorGroupUserRole = stableSysId(p, 'editor_group_user_role');
        ids.adminGroupUserRole = stableSysId(p, 'admin_group_user_role');
      }
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
  // Suggests a next version after finding an already-installed app. Prefer semver.js's
  // suggestRelease() for Fluent-diff-aware bumps; these remain for simple Connect fallbacks.
  function bumpSemver(version, level) {
    var parts = String(version || '').split('.');
    if (parts.length !== 3 || !parts.every(function (p) { return /^\d+$/.test(p); })) { return version; }
    var major = parseInt(parts[0], 10);
    var minor = parseInt(parts[1], 10);
    var patch = parseInt(parts[2], 10);
    if (level === 'major') { return (major + 1) + '.0.0'; }
    if (level === 'minor') { return major + '.' + (minor + 1) + '.0'; }
    return major + '.' + minor + '.' + (patch + 1);
  }
  function bumpPatchVersion(version) { return bumpSemver(version, 'patch'); }

  /* ==================================================================================
     Pure assembly: given already-fetched source text, extract every piece a package needs.
     No fetch/fs here - hosts read their sources however their environment allows and pass the
     text in. `opts.formatFn`, if given, runs over every extracted script body (e.g. js-beautify
     in a browser host); defaults to identity.
     ================================================================================== */

  var DEFAULT_SERVER_SCRIPT = '(function() {\n  /* No server-side data needed - this widget\'s logic lives entirely in its injected Angular services. */\n})();';

  // Drop Sass @import / @use / @forward lines. Widget <css> is compiled by ServiceNow libsass with
  // no partial search path - unresolved imports fail the whole stylesheet. Partials belong in
  // sources.sharedScss (manifest.sharedScssPartials) so they are already inlined above this strip.
  function stripSassImports(text) {
    return String(text || '').replace(/^[ \t]*@(?:import|use|forward)\b[^;]*;[ \t]*\r?\n?/gm, '');
  }

  // now-sdk validates widget client_script with a regex that requires
  // `api.controller = function(...) {` on a single line - multiline DI lists fail TS213.
  function collapseWidgetClientScriptHeader(clientScript) {
    var text = String(clientScript || '');
    var marker = 'api.controller';
    var markerIndex = text.indexOf(marker);

    if (markerIndex < 0) {
      return text;
    }

    var openParenIndex = text.indexOf('(', markerIndex);

    if (openParenIndex < 0) {
      return text;
    }

    var depth = 0;
    var closeParenIndex = -1;
    var index;

    for (index = openParenIndex; index < text.length; index++) {
      if (text[index] === '(') {
        depth++;
      } else if (text[index] === ')') {
        depth--;
        if (depth === 0) {
          closeParenIndex = index;
          break;
        }
      }
    }

    if (closeParenIndex < 0) {
      return text;
    }

    var braceIndex = text.indexOf('{', closeParenIndex);

    if (braceIndex < 0) {
      return text;
    }

    var params = text.slice(openParenIndex + 1, closeParenIndex).replace(/\s+/g, ' ').trim();
    var header = 'api.controller = function (' + params + ') {';

    return header + text.slice(braceIndex + 1);
  }

  // Wraps a raw view-partial fragment for a non-shell widget: the packager decides the outer
  // div and the ng-if that gates it on AppState's current view (see manifest.schema.md's
  // widgets[] doc) - the partial file itself stays the same bare fragment the harness ng-includes.
  // When opts.widgetId is set (multi-widget view widgets), the inner div also gets the harness's
  // tabpanel wiring (id=dm-panel-<id>, role=tabpanel, aria-labelledby=dm-tab-<id>) so Shell tabs'
  // aria-controls resolve after deploy — not only in index.html.
  function wrapPartialTemplate(scopeClass, partialBody, opts) {
    opts = opts || {};
    // app--view: no top padding - Shell's .app--chrome already owns the page top gutter.
    var panelAttrs = ' class="app app--view" ng-show="c.isActiveView()"';
    if (opts.widgetId) {
      var panelId = 'dm-panel-' + opts.widgetId;
      var tabId = 'dm-tab-' + opts.widgetId;
      panelAttrs += ' id="' + panelId + '" role="tabpanel" aria-labelledby="' + tabId + '"';
    }
    var inner = '<div' + panelAttrs + '>\n' +
      String(partialBody).replace(/^\n/, '').replace(/\n$/, '') + '\n  </div>';
    return '<div class="' + scopeClass + '">\n' + inner + '\n</div>';
  }

  // A `templateFile` fragment already authors its OWN root div (attributes, ng-class, always
  // visible) - used as-is (just ng-controller-stripped, same convention as the single-widget path).
  function wrapFileTemplate(scopeClass, fileBody) {
    var stripped = String(fileBody).replace(/\s+ng-controller="[^"]*"/, '').trim();
    return '<div class="' + scopeClass + '">\n' + stripped + '\n</div>';
  }

  function buildParts(manifest, sources, opts) {
    var formatFn = (opts && opts.formatFn) || function (s) { return s; };
    var moduleName = manifest.angularModuleName;

    var providers = (manifest.providers || []).filter(function (p) {
      // deploy: false = harness-only (e.g. seed data). Omit from the shipped package entirely.
      return p.deploy !== false;
    }).map(function (p) {
      var src = sources.providerSrcs[p.file];
      if (src == null) { throw new Error('No source provided for provider file ' + p.file); }
      if (p.type === 'script') {
        throw new Error('Provider ' + p.file + ' has type "script" but deploy is not false - script assets are harness-only.');
      }
      var body = extractProviderBody(src, moduleName, p.type === 'directive' ? 'directive' : 'factory');
      if (p.trailingMarker) { body += '\n\n' + extractTrailingMarker(src, p.trailingMarker); }
      return { name: p.name, type: p.type, file: p.file, script: formatFn(body) };
    });

    // Shared SCSS partials (e.g. a design-token file an app opts into) are inlined at the TOP of the
    // widget's own <css>, before the app's rules - the host reads the files named in
    // manifest.sharedScssPartials and passes their concatenated text as sources.sharedScss. Because
    // they're `!default` token declarations (bare statements), scopeScss passes them through
    // untouched; the app's rules that reference those tokens compile against them. This is what gives
    // every widget the shared token vocabulary + portal portability. See manifest.schema.md.
    // Strip @import/@use: ServiceNow's widget SCSS compile cannot resolve local partials; tokens
    // must arrive via sharedScss (or be inlined in the file). Leaving @import 'tokens' ships broken CSS.
    var scssSrc = stripSassImports(
      (sources.sharedScss ? sources.sharedScss + '\n\n' : '') + sources.scssSrc
    );
    // Every widget (single or multi) shares this SAME compiled css - see manifest.schema.md's
    // widgets[] doc for why splitting per-widget SCSS isn't worth it for this suite.
    var css = sassSafeCss(scopeScss(scssSrc, '.' + manifest.widgetScopeClass));

    var widgetDefs = Array.isArray(manifest.widgets) ? manifest.widgets.filter(Boolean) : [];

    if (!widgetDefs.length) {
      // Legacy single-widget path - UNCHANGED behavior/shape for apps with no manifest.widgets
      // (Glide Studio, Standards).
      var controllerFn = unwrapDiArray(extractProviderBody(sources.controllerSrc, moduleName, 'controller'));
      var clientScript = collapseWidgetClientScriptHeader(formatFn('api.controller = ' + controllerFn + ';'));
      var serverScript = formatFn(sources.serverScript || DEFAULT_SERVER_SCRIPT);
      var template = buildTemplateFromSource(
        sources.indexHtml,
        manifest.widgetScopeClass,
        sources.viewPartials || null
      );
      return { providers: providers, clientScript: clientScript, serverScript: serverScript, template: template, css: css, link: sources.link || '' };
    }

    // Multi-widget path: one { clientScript, template, serverScript } bundle per declared widget,
    // sharing the same providers/css/link computed above. sources.widgets is keyed by widget id -
    // see manifest.schema.md's widgets[] doc and build.js/console.js's loadSources() for how hosts
    // populate it.
    var widgetSources = sources.widgets || {};
    var widgets = widgetDefs.map(function (w) {
      var controllerSrc = widgetSources.controllerSrcs && widgetSources.controllerSrcs[w.id];
      if (controllerSrc == null) { throw new Error('No controller source provided for widget "' + w.id + '"'); }
      var widgetControllerFn = unwrapDiArray(extractProviderBody(controllerSrc, moduleName, 'controller'));
      var widgetClientScript = collapseWidgetClientScriptHeader(formatFn('api.controller = ' + widgetControllerFn + ';'));

      var widgetTemplate;
      if (w.templatePartial) {
        var partialBody = widgetSources.templateTexts && widgetSources.templateTexts[w.id];
        if (partialBody == null) { throw new Error('No template partial source provided for widget "' + w.id + '"'); }
        widgetTemplate = wrapPartialTemplate(manifest.widgetScopeClass, partialBody, { widgetId: w.id });
      } else if (w.templateFile) {
        var fileBody = widgetSources.templateTexts && widgetSources.templateTexts[w.id];
        if (fileBody == null) { throw new Error('No template file source provided for widget "' + w.id + '"'); }
        widgetTemplate = wrapFileTemplate(manifest.widgetScopeClass, fileBody);
      } else {
        // No templatePartial/templateFile = the shell/default widget: same extraction as the
        // legacy single-widget path (index.html's own authored <div class="app">...</div>).
        widgetTemplate = buildTemplateFromSource(sources.indexHtml, manifest.widgetScopeClass, sources.viewPartials || null);
      }

      var widgetServerScript = formatFn(w.serverScript ? (sources.serverScript || DEFAULT_SERVER_SCRIPT) : DEFAULT_SERVER_SCRIPT);

      return {
        id: w.id,
        name: w.name || manifest.appName,
        widgetId: w.widgetId,
        clientScript: widgetClientScript,
        template: widgetTemplate,
        serverScript: widgetServerScript,
      };
    });

    return { providers: providers, css: css, link: sources.link || '', widgets: widgets };
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

     fluent.js's assembleFluent() builds this SAME model
     and then just walk it their own way - so a new field on, say, sp_container is added in
     exactly one place (here) and both output formats pick it up automatically. Field ORDER is
     preserved deliberately (it matches a real ServiceNow Update Set export's per-table field
     order, which is not simple alphabetical - see e.g. sp_angular_provider's type-before-script)
     so XML output stays byte-identical to what this core produced before the model existed.
     ================================================================================== */

  function buildRecordModel(manifest, parts) {
    var ids = deriveSysIds(manifest);
    var scopeTag = '<sys_scope display_value="' + esc(manifest.appName).replace(/"/g, '&quot;') + '">' + ids.app + '</sys_scope>';
    // `value` alongside the display-decorated `scopeTag` marker is for a non-XML consumer (a live
    // Table API write - see recordToApiFields) that needs the plain sys_id, not the XML markup.
    var SC = { name: 'sys_scope', scopeTag: true, xmlOnly: true, value: ids.app }; // reusable <sys_scope> sentinel
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
    // original record-model concatenation order). Optional editor role when roles.editorRoleName
    // is set - editor/admin groups also get the user role so page access via the user role works.
    if (manifest.features && manifest.features.roles) {
      var r = manifest.roles;
      var withEditor = hasEditorRole(manifest);
      records.push({ table: 'sys_user_role', sysId: ids.userRole, key: 'userRole', fields: [
        // Fluent's Data<"sys_user_role"> has no `active` field - omit it (roles are active by default).
        { name: 'description', value: r.userRoleDescription || ('Can view and use the ' + manifest.appName + ' tool.') },
        { name: 'name', value: r.userRoleName },
        { name: 'sys_id', value: ids.userRole, xmlOnly: true },
        { name: 'sys_name', value: r.userRoleName, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_user_role_' + ids.userRole, xmlOnly: true },
      ] });
      if (withEditor) {
        records.push({ table: 'sys_user_role', sysId: ids.editorRole, key: 'editorRole', fields: [
          { name: 'description', value: r.editorRoleDescription || ('Can edit ' + manifest.appName + ' content in the tool.') },
          { name: 'name', value: r.editorRoleName },
          { name: 'sys_id', value: ids.editorRole, xmlOnly: true },
          { name: 'sys_name', value: r.editorRoleName, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_user_role_' + ids.editorRole, xmlOnly: true },
        ] });
      }
      records.push({ table: 'sys_user_role', sysId: ids.adminRole, key: 'adminRole', fields: [
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
      if (withEditor) {
        records.push({ table: 'sys_user_group', sysId: ids.editorGroup, key: 'editorGroup', fields: [
          { name: 'active', value: true },
          { name: 'description', value: r.editorGroupDescription || ('Members can edit ' + manifest.appName + ' content in the tool.') },
          { name: 'name', value: r.editorGroupName },
          { name: 'sys_id', value: ids.editorGroup, xmlOnly: true },
          { name: 'sys_name', value: r.editorGroupName, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_user_group_' + ids.editorGroup, xmlOnly: true },
        ] });
      }
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
      if (withEditor) {
        records.push({ table: 'sys_group_has_role', sysId: ids.editorGroupRole, key: 'editorGroupRole', fields: [
          { name: 'group', value: ids.editorGroup },
          { name: 'role', value: ids.editorRole },
          { name: 'sys_id', value: ids.editorGroupRole, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_group_has_role_' + ids.editorGroupRole, xmlOnly: true },
        ] });
        records.push({ table: 'sys_group_has_role', sysId: ids.editorGroupUserRole, key: 'editorGroupUserRole', fields: [
          { name: 'group', value: ids.editorGroup },
          { name: 'role', value: ids.userRole },
          { name: 'sys_id', value: ids.editorGroupUserRole, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_group_has_role_' + ids.editorGroupUserRole, xmlOnly: true },
        ] });
      }
      records.push({ table: 'sys_group_has_role', sysId: ids.adminGroupRole, key: 'adminGroupRole', fields: [
        { name: 'group', value: ids.adminGroup },
        { name: 'role', value: ids.adminRole },
        { name: 'sys_id', value: ids.adminGroupRole, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sys_group_has_role_' + ids.adminGroupRole, xmlOnly: true },
      ] });
      if (withEditor) {
        records.push({ table: 'sys_group_has_role', sysId: ids.adminGroupUserRole, key: 'adminGroupUserRole', fields: [
          { name: 'group', value: ids.adminGroup },
          { name: 'role', value: ids.userRole },
          { name: 'sys_id', value: ids.adminGroupUserRole, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_group_has_role_' + ids.adminGroupUserRole, xmlOnly: true },
        ] });
      }
    }

    // Scaffold theme - only when features.theme is on (default). Needed so sp_portal can reference
    // a theme; not the token carrier (widget CSS is). Apps that drop into an existing portal set
    // features.theme: false (and usually features.portal: false with it).
    if (featureOn(manifest, 'theme')) {
      records.push({ table: 'sp_theme', sysId: ids.theme, key: 'theme', fields: [
        { name: 'css_variables', empty: true },
        { name: 'name', value: manifest.appName + ' Theme' },
        { name: 'navbar_fixed', value: true },
        { name: 'sys_id', value: ids.theme, xmlOnly: true },
        { name: 'sys_name', value: manifest.appName + ' Theme', xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sp_theme_' + ids.theme, xmlOnly: true },
      ] });
    }

    // Page tree. <roles> on the page is what actually gates it (server-side, before the page ever
    // renders); a manifest without features.roles ships this blank, same as before.
    // Naming matches real Service Portal Update Set exports: page id/sys_name are the SP page id
    // (urlSuffix with '_' or manifest.pageId), title is the display title, container is
    // "{title} - Container 1", row/column sys_name is the order digit.
    var pageId = manifest.pageId || (manifest.urlSuffix
      ? String(manifest.urlSuffix).replace(/-/g, '_')
      : (manifest.scope + '_page'));
    var pageTitle = manifest.pageTitle || manifest.appName;
    var layoutOrder = '1';
    var containerName = pageTitle + ' - Container 1';
    var pageRolesTag = '';
    if (manifest.features && manifest.features.roles) {
      // All declared roles can open the page. Editor/admin groups also carry the user role, but
      // listing every role sys_id keeps page access correct even if group membership is incomplete.
      pageRolesTag = [ids.userRole, ids.editorRole, ids.adminRole].filter(Boolean).join(',');
    }
    records.push({ table: 'sp_page', sysId: ids.page, key: 'page', fields: [
      { name: 'category', value: 'custom' },
      { name: 'id', value: pageId },
      { name: 'internal', value: false },
      { name: 'roles', value: pageRolesTag },
      { name: 'short_description', value: manifest.appName + ' page' },
      { name: 'sys_id', value: ids.page, xmlOnly: true },
      { name: 'sys_name', value: pageId, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_page_' + ids.page, xmlOnly: true },
      { name: 'title', value: pageTitle },
    ] });
    records.push({ table: 'sp_container', sysId: ids.container, key: 'container', fields: [
      { name: 'bootstrap_alt', value: 'false' },
      { name: 'name', value: containerName },
      { name: 'order', value: layoutOrder },
      { name: 'sp_page', value: ids.page },
      { name: 'sys_id', value: ids.container, xmlOnly: true },
      { name: 'sys_name', value: containerName, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_container_' + ids.container, xmlOnly: true },
      { name: 'width', value: 'container-fluid' },
    ] });
    records.push({ table: 'sp_row', sysId: ids.row, key: 'row', fields: [
      { name: 'order', value: layoutOrder },
      { name: 'sp_container', value: ids.container },
      { name: 'sys_id', value: ids.row, xmlOnly: true },
      { name: 'sys_name', value: layoutOrder, xmlOnly: true },
      SC,
      { name: 'sys_update_name', value: 'sp_row_' + ids.row, xmlOnly: true },
    ] });
    records.push({ table: 'sp_column', sysId: ids.column, key: 'column', fields: [
      { name: 'order', value: layoutOrder },
      { name: 'size', value: '12' },
      { name: 'sp_row', value: ids.row },
      { name: 'sys_id', value: ids.column, xmlOnly: true },
      { name: 'sys_name', value: layoutOrder, xmlOnly: true },
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

    // The widget(s). Multi-widget apps (parts.widgets from buildParts) get one sp_widget +
    // sp_instance PER declared widget, stacked in column order (widgets[] array order = sp_instance
    // order 1..N); single-widget apps keep the original one-widget/one-instance shape unchanged.
    if (parts.widgets && parts.widgets.length) {
      parts.widgets.forEach(function (w, index) {
        var widgetIds = ids.widgets[w.id];
        var widgetRecordId = w.widgetId || (pageId + '_' + w.id);
        var widgetName = w.name || manifest.appName;
        records.push({ table: 'sp_widget', sysId: widgetIds.widget, key: 'widget_' + w.id, fields: [
          { name: 'category', value: 'custom' },
          { name: 'client_script', value: w.clientScript, cdata: true },
          { name: 'controller_as', value: manifest.controllerAs || 'vm' },
          { name: 'css', value: parts.css, cdata: true },
          { name: 'demo_data', empty: true },
          { name: 'description', value: widgetName },
          { name: 'has_preview', value: true },
          { name: 'id', value: widgetRecordId },
          { name: 'internal', value: false },
          { name: 'link', value: parts.link || '', cdata: true },
          { name: 'name', value: widgetName },
          { name: 'option_schema', empty: true },
          { name: 'public', value: false },
          { name: 'roles', empty: true },
          { name: 'script', value: w.serverScript, cdata: true },
          { name: 'servicenow', value: false },
          { name: 'sys_class_name', value: 'sp_widget', xmlOnly: true },
          { name: 'sys_id', value: widgetIds.widget, xmlOnly: true },
          { name: 'sys_name', value: widgetName, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sp_widget_' + widgetIds.widget, xmlOnly: true },
          { name: 'template', value: w.template, cdata: true },
        ] });

        records.push({ table: 'sp_instance', sysId: widgetIds.instance, key: 'instance_' + w.id, fields: [
          { name: 'active', value: true },
          { name: 'order', value: index + 1 },
          { name: 'sp_column', value: ids.column },
          { name: 'sp_widget', value: widgetIds.widget },
          { name: 'sys_class_name', value: 'sp_instance', xmlOnly: true },
          { name: 'sys_id', value: widgetIds.instance, xmlOnly: true },
          { name: 'sys_name', value: widgetName, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sp_instance_' + widgetIds.instance, xmlOnly: true },
          // Title shows in Application Files; empty titles read as blank names in Studio.
          { name: 'title', value: widgetName },
        ] });
      });
    } else {
      // id defaults to the page id (real SP exports often share that slug); override with
      // manifest.widgetId. name/sys_name stay the application display name.
      var widgetId = manifest.widgetId || pageId;
      records.push({ table: 'sp_widget', sysId: ids.widget, key: 'widget', fields: [
        { name: 'category', value: 'custom' },
        { name: 'client_script', value: parts.clientScript, cdata: true },
        // Default 'vm' matches apps already shipped with that alias (Glide Studio, Standards).
        // Service Portal's platform default is 'c' - apps that prefer that set manifest.controllerAs.
        { name: 'controller_as', value: manifest.controllerAs || 'vm' },
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
        // Fluent Record() does not apply platform defaults - omit active and the instance stays
        // inactive, so the widget never renders on the page.
        { name: 'active', value: true },
        { name: 'order', value: 1 },
        { name: 'sp_column', value: ids.column },
        { name: 'sp_widget', value: ids.widget },
        { name: 'sys_class_name', value: 'sp_instance', xmlOnly: true },
        { name: 'sys_id', value: ids.instance, xmlOnly: true },
        { name: 'sys_name', value: manifest.appName, xmlOnly: true },
        SC,
        { name: 'sys_update_name', value: 'sp_instance_' + ids.instance, xmlOnly: true },
        // Title shows in Application Files; empty titles read as blank names in Studio.
        { name: 'title', value: manifest.appName },
      ] });
    }

    if (featureOn(manifest, 'portal')) {
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
    }

    // Opt-in ACL layer - AFTER everything else (matches the original's non-interleaved order:
    // every table's ACL record first, then every table's ACL-role record). Scoped to just this
    // app's own records via a `sys_scope=` condition, so this grant can't reach another scoped
    // app's records on the same table - additive alongside whatever ACL(s) the target instance
    // already has (matching ACLs at the same table+operation are OR'd).
    // Custom manifest.tables[] get their own read (user+editor+admin) and write/create/delete
    // (editor+admin when editor exists, else admin-only) ACLs on the full scoped table name.
    var tablesModel = buildTablesModel(manifest);
    if (manifest.features && manifest.features.roles) {
      var r2 = manifest.roles;
      var withEditorAcl = hasEditorRole(manifest);
      var aclTables = ACL_TABLES.filter(function (t) {
        if (t === 'sp_theme') { return featureOn(manifest, 'theme'); }
        if (t === 'sp_portal') { return featureOn(manifest, 'portal'); }
        return true;
      });
      function pushAcl(tableName, operation, seedSuffix, roleIds, description) {
        var aclId = stableSysId(manifest.sysIdPrefix, seedSuffix + ':acl');
        var aclFields = [
          { name: 'active', value: true },
          { name: 'admin_overrides', value: false },
          { name: 'description', value: description },
          { name: 'name', value: tableName },
          { name: 'operation', value: operation },
          { name: 'sys_id', value: aclId, xmlOnly: true },
          { name: 'sys_name', value: tableName + '.' + operation, xmlOnly: true },
          SC,
          { name: 'sys_update_name', value: 'sys_security_acl_' + aclId, xmlOnly: true },
          { name: 'type', value: 'record' },
        ];
        // Portal/layout ACLs stay scoped to this app; custom data tables are already app-scoped.
        if (tableName.indexOf('sp_') === 0) {
          aclFields.splice(2, 0, { name: 'condition', value: 'sys_scope=' + ids.app });
        }
        records.push({ table: 'sys_security_acl', sysId: aclId, key: 'acl_' + seedSuffix.replace(/[^a-zA-Z0-9_]/g, '_'), fields: aclFields });
        roleIds.forEach(function (roleId, idx) {
          var aclRoleId = stableSysId(manifest.sysIdPrefix, seedSuffix + ':acl_role:' + idx);
          records.push({ table: 'sys_security_acl_role', sysId: aclRoleId, key: 'acl_role_' + seedSuffix.replace(/[^a-zA-Z0-9_]/g, '_') + '_' + idx, fields: [
            { name: 'sys_security_acl', value: aclId },
            { name: 'sys_user_role', value: roleId },
            { name: 'sys_id', value: aclRoleId, xmlOnly: true },
            SC,
            { name: 'sys_update_name', value: 'sys_security_acl_role_' + aclRoleId, xmlOnly: true },
          ] });
        });
      }
      aclTables.forEach(function (t) {
        pushAcl(t, 'write', t, [ids.adminRole],
          'Lets ' + r2.adminRoleName + ' edit ' + t + ' records that belong to this application.');
      });
      tablesModel.forEach(function (t) {
        var readRoles = [ids.userRole, ids.adminRole];
        var writeRoles = [ids.adminRole];
        if (withEditorAcl) {
          readRoles = [ids.userRole, ids.editorRole, ids.adminRole];
          writeRoles = [ids.editorRole, ids.adminRole];
        }
        pushAcl(t.name, 'read', 'table:' + t.shortName + ':read', readRoles,
          'Lets ' + appRoleNames(r2, withEditorAcl) + ' read ' + t.label + ' rows.');
        ['write', 'create', 'delete'].forEach(function (op) {
          pushAcl(t.name, op, 'table:' + t.shortName + ':' + op, writeRoles,
            'Lets ' + (withEditorAcl ? (r2.editorRoleName + '/' + r2.adminRoleName) : r2.adminRoleName) +
            ' ' + op + ' ' + t.label + ' rows.');
        });
      });
    }

    return { ids: ids, scopeTag: scopeTag, records: records, tables: tablesModel };
  }

  function appRoleNames(r, withEditor) {
    if (withEditor) {
      return r.userRoleName + '/' + r.editorRoleName + '/' + r.adminRoleName;
    }
    return r.userRoleName + '/' + r.adminRoleName;
  }

  return {
    // extraction
    findMatchingParen: findMatchingParen, extractProviderBody: extractProviderBody,
    unwrapDiArray: unwrapDiArray, extractTrailingMarker: extractTrailingMarker,
    buildTemplateFromSource: buildTemplateFromSource,
    inlineViewPartials: inlineViewPartials,
    extractAppDiv: extractAppDiv,
    // styling
    scopeScss: scopeScss, sassSafeCss: sassSafeCss, extractDefaultVariables: extractDefaultVariables,
    // sys_id / scope
    stableSysId: stableSysId, deriveSysIds: deriveSysIds,
    deriveScope: deriveScope, deriveScopePrefix: deriveScopePrefix,
    bumpSemver: bumpSemver, bumpPatchVersion: bumpPatchVersion,
    scopeSlug: scopeSlug, deriveVendorPrefix: deriveVendorPrefix, SCOPE_MAX: SCOPE_MAX,
    // assembly - buildRecordModel is the shared source of truth fluent.js's assembleFluent consumes.
    buildParts: buildParts, buildRecordModel: buildRecordModel,
    buildTablesModel: buildTablesModel, fullTableName: fullTableName, hasEditorRole: hasEditorRole,
    ACL_TABLES: ACL_TABLES,
  };
});
