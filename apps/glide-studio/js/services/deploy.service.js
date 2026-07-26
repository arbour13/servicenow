/* Packages this Angular app as a real ServiceNow scoped application. The extraction/XML-assembly
   logic itself (bracket-depth provider-body extraction, SCSS scoping, every sp_* record builder,
   assembleXml) lives in the SHARED core at ../../../tools/sn-deployment-packager/core.js (see
   manifest.schema.md there for the manifest/sources contract). This app's own manifest (provider
   list, sys_id prefix, roles, file paths) lives in ../../deploy.manifest.js - the one descriptor
   this app shares with the standalone deploy console - not duplicated here. This file owns
   everything that's specific to running the core INSIDE a browser, for THIS app: fetching every
   source file over HTTP, js-beautify formatting, and the live-instance connection used for
   scope-prefix detection.

   Every source file is fetched via its own <script src> URL; the source (not the live/compiled
   DOM, not the compiled CSS) is always what gets packaged - see core.js's own header
   comment for why (Angular ng-if/ng-repeat compilation artifacts, and SCSS $-variable references
   that need to reach ServiceNow's own portal compiler unresolved). */
angular.module('glideStudio').factory('DeployService', [function () {
  'use strict';

  var core = window.SNDeploymentPackager.core;
  var descriptor = window.SNAppManifests['glide-studio'];

  var PROVIDER_FILES = descriptor.manifest.providers;
  var CONTROLLER_FILE = descriptor.files.controller;
  var SCSS_FILE = descriptor.files.scss;
  var INDEX_FILE = descriptor.files.index;
  var SERVER_SCRIPT_SOURCE = descriptor.serverScriptSource;
  var GLIDE_STUDIO_MANIFEST = descriptor.manifest;

  // js-beautify is vendored dev/authoring-only (index.html's lib/beautify.js); it never ships
  // inside the deployed widget.
  var WIDGET_SCRIPT_FORMAT_OPTIONS = {
    indent_size: 2,
    indent_char: ' ',
    brace_style: 'collapse',
    space_after_anon_function: true,
    space_in_paren: false,
    preserve_newlines: true,
    max_preserve_newlines: 2,
    end_with_newline: false,
    jslint_happy: false,
  };
  function beautifierIsAvailable() {
    return typeof window !== 'undefined' && typeof window.js_beautify === 'function';
  }
  // Runs extracted widget JS through js-beautify before it's embedded in the package - the same
  // engine behind ServiceNow's own "Format Code" button, so the export reads the way an admin
  // would expect after clicking it.
  function formatWidgetScript(code) {
    var source = String(code == null ? '' : code);
    if (!beautifierIsAvailable()) { return source; }
    try { return window.js_beautify(source, WIDGET_SCRIPT_FORMAT_OPTIONS); } catch (e) { return source; }
  }

  function fetchText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) { throw new Error('Failed to fetch ' + url + ': HTTP ' + r.status); }
      return r.text();
    });
  }

  // Live-instance prefix detection (network I/O) - shared with the standalone deploy console, see
  // ../../../tools/sn-deployment-packager/instance-connect.js's header comment.
  var detectCompanyPrefix = window.SNDeploymentPackager.instanceConnect.detectCompanyPrefix;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function nowStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  // Concatenates every provider's extracted script into one reviewable blob for the Deploy
  // modal's "Services" tab - each of these ships as its own <sp_angular_provider> record inside
  // the Package XML, but buried in CDATA that's painful to read there. This is the one place a
  // user can see every service/directive's actual code, in full, before importing anything. Pure
  // presentation - not part of the shared core, since it's specific to how THIS modal reviews a
  // package, not to assembling one.
  function formatProviders(providers) {
    return (providers || []).map(function (p) {
      var header = p.name + ' (' + p.type + ') — ' + p.file;
      var rule = new Array(header.length + 1).join('=');
      return '/* ' + rule + '\n   ' + header + '\n   ' + rule + ' */\n' + p.script;
    }).join('\n\n');
  }

  // Resolves every source-derived piece ONCE, independent of appName/scope/version. Callers cache
  // the result and re-run assembleXml() against it on every keystroke, so field edits in the
  // Deploy dialog feel instant instead of re-fetching on each one.
  function buildParts() {
    var providerFetches = PROVIDER_FILES.map(function (p) { return fetchText(p.file); });
    return Promise.all([Promise.all(providerFetches), fetchText(CONTROLLER_FILE), fetchText(SCSS_FILE), fetchText(INDEX_FILE)])
      .then(function (results) {
        var providerSrcs = {};
        PROVIDER_FILES.forEach(function (p, i) { providerSrcs[p.file] = results[0][i]; });
        var sources = {
          controllerSrc: results[1],
          scssSrc: results[2],
          indexHtml: results[3],
          providerSrcs: providerSrcs,
          serverScript: SERVER_SCRIPT_SOURCE,
          link: '',
        };
        return core.buildParts(GLIDE_STUDIO_MANIFEST, sources, { formatFn: formatWidgetScript });
      });
  }

  // dep: {appName, scope, version} - the Deploy dialog's live-edited fields. Synchronous - parts
  // must already be resolved (see buildParts). Returns the full <unload> XML string.
  function assembleXml(parts, dep) {
    var manifest = {};
    for (var k in GLIDE_STUDIO_MANIFEST) { if (Object.prototype.hasOwnProperty.call(GLIDE_STUDIO_MANIFEST, k)) { manifest[k] = GLIDE_STUDIO_MANIFEST[k]; } }
    manifest.appName = ((dep && dep.appName) || 'Glide Studio').trim() || 'Glide Studio';
    manifest.scope = ((dep && dep.scope) || 'x_glide_studio_ng').trim() || 'x_glide_studio_ng';
    manifest.version = ((dep && dep.version) || '1.0.0').trim() || '1.0.0';
    return core.assembleXml(manifest, parts, { stamp: nowStamp() });
  }

  return {
    buildParts: buildParts,
    assembleXml: assembleXml,
    formatProviders: formatProviders,
    deriveScope: core.deriveScope,
    detectCompanyPrefix: detectCompanyPrefix,
    SCOPE_MAX: core.SCOPE_MAX,
  };
}]);
