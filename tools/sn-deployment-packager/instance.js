/* Read-only connection to a live TARGET ServiceNow instance: a Basic-Auth fetch used only to detect
   that instance's application vendor prefix while a Deploy UI is filling in a recommended scope.
   Nothing here writes, installs, or commits anything - this package is imported by a human.

   BROWSER-ONLY - there is no module.exports branch here (it needs fetch/btoa), so do NOT require()
   this from Node; the CLI (build.js) and the app build-deploy.js scripts never touch it.

   Network I/O, so deliberately kept OUT of the pure core.js (see that file's header comment and
   manifest.schema.md's "Host responsibilities" - the core never touches the network or filesystem
   itself). Shared between every browser Deploy host that opts into `deployOptions.showConnection`
   (see manifest.schema.md's "deploy.manifest.js" section) - Glide Studio's own live Deploy modal
   (js/services/deploy.service.js) and the standalone deploy console (console.js) both load
   this file instead of each hand-keeping a copy. Exposes
   window.SNDeploymentPackager.instance. */
(function (root) {
  'use strict';
  root.SNDeploymentPackager = root.SNDeploymentPackager || {};

  // conn: {instanceUrl, username, password}. Not ConnectionService.apiFetch - that service's
  // instance-hosted branch ignores whatever `conn` it's given and always calls same-origin; the
  // deploy target is deliberately allowed to differ from both an app's own Settings connection AND
  // the instance this tool happens to be running on.
  function deployFetch(path, params, conn) {
    var base = ((conn && conn.instanceUrl) || '').trim().replace(/\/$/, '');
    var user = ((conn && conn.username) || '').trim();
    var pass = (conn && conn.password) || '';
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(base + path + qs, { headers: { 'Authorization': 'Basic ' + btoa(user + ':' + pass), 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) { var e = new Error('HTTP ' + r.status + ' ' + r.statusText); e.httpStatus = r.status; throw e; }
        return r.json();
      }).then(function (json) { return json.result; });
  }

  // Looks up the target instance's application vendor prefix so a Deploy UI can recommend a scope
  // that matches it. Tries the company-code property first, then falls back to an existing scoped
  // app's vendor_prefix. Resolves to just the code (e.g. 'acme'), or ''.
  function detectCompanyPrefix(conn) {
    return deployFetch('/api/now/table/sys_properties', {
      sysparm_query: 'name=glide.appcreator.company.code', sysparm_fields: 'value', sysparm_limit: '1',
    }, conn).catch(function () { return null; }).then(function (rows) {
      if (rows && rows[0] && rows[0].value) { return String(rows[0].value).trim(); }
      return deployFetch('/api/now/table/sys_scope', {
        sysparm_query: 'scopeSTARTSWITHx_^scope!=global^vendor_prefixISNOTEMPTY^ORDERBYsys_created_on',
        sysparm_fields: 'vendor_prefix', sysparm_limit: '1',
      }, conn).then(function (rows2) {
        if (rows2 && rows2[0] && rows2[0].vendor_prefix) { return String(rows2[0].vendor_prefix).replace(/^x_/, '').trim(); }
        return '';
      });
    });
  }

  root.SNDeploymentPackager.instance = { deployFetch: deployFetch, detectCompanyPrefix: detectCompanyPrefix };
})(typeof self !== 'undefined' ? self : this);
