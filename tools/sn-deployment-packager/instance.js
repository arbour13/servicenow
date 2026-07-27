/* Read-only connection to a live TARGET ServiceNow instance: Basic-Auth fetches used to detect that
   instance's application vendor prefix and to look up whether an app is already installed there, so
   a Deploy UI can prefill a recommended scope and the next version instead of guessing. Nothing
   here writes, installs, or commits anything - this package is imported by a human.

   BROWSER-ONLY - there is no module.exports branch here (it needs fetch/btoa), so do NOT require()
   this from Node; the CLI (build.js) and the app build-deploy.js scripts never touch it.

   Network I/O, so deliberately kept OUT of the pure core.js (see that file's header comment and
   manifest.schema.md's "Host responsibilities" - the core never touches the network or filesystem
   itself). Loaded by the standalone deploy console (console.js) for any app with
   `deployOptions.showConnection: true` (see manifest.schema.md's "deploy.manifest.js" section) -
   kept as its own shared file rather than folded into console.js so any OTHER future browser Deploy
   host can load it the same way instead of keeping its own copy. Exposes
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

  // Looks up whether THIS app already exists on the target instance, keyed by its own deterministic
  // sys_id (see core.js's deriveSysIds/stableSysId - independent of scope/company code, since
  // sysIdPrefix is a fixed per-app constant in that app's own deploy.manifest.js). That's what makes
  // this a reliable "is it already there" check regardless of what scope it was actually installed
  // under: a Deploy UI can prefill the REAL installed scope/name and suggest the next version, so
  // redeploying updates the same app instead of the scope silently drifting on every rebuild.
  // Resolves to {sys_id, name, version, scope} if found, or null if not (a fresh first-time deploy,
  // OR a lookup failure - bad creds/network error - since a caller treats both the same way: fall
  // back to a bare scope prefix rather than guessing).
  function getInstalledApp(conn, appSysId) {
    return deployFetch('/api/now/table/sys_app', {
      sysparm_query: 'sys_id=' + appSysId, sysparm_fields: 'sys_id,name,version,scope', sysparm_limit: '1',
    }, conn).then(function (rows) {
      return (rows && rows[0]) || null;
    }).catch(function () { return null; });
  }

  root.SNDeploymentPackager.instance = { deployFetch: deployFetch, detectCompanyPrefix: detectCompanyPrefix, getInstalledApp: getInstalledApp };
})(typeof self !== 'undefined' ? self : this);
