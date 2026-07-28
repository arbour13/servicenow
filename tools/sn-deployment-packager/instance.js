/* Connection to a live TARGET ServiceNow instance: Basic-Auth calls used to detect that instance's
   application vendor prefix and look up whether an app is already installed there.

   BROWSER-ONLY - there is no module.exports branch here (it needs fetch/btoa), so do NOT require()
   this from Node; the CLI (build.js) never touches it.

   Network I/O, so deliberately kept OUT of the pure core.js. Loaded by the standalone deploy
   console (console.js) for any app with `deployOptions.showConnection: true`. Exposes
   window.SNDeploymentPackager.instance. */
(function (root) {
  'use strict';
  root.SNDeploymentPackager = root.SNDeploymentPackager || {};

  function connBase(conn) {
    return {
      base: ((conn && conn.instanceUrl) || '').trim().replace(/\/$/, ''),
      authHeader: 'Basic ' + btoa(((conn && conn.username) || '').trim() + ':' + ((conn && conn.password) || '')),
    };
  }

  function deployFetch(path, params, conn) {
    var c = connBase(conn);
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(c.base + path + qs, { headers: { 'Authorization': c.authHeader, 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) { var e = new Error('HTTP ' + r.status + ' ' + r.statusText); e.httpStatus = r.status; throw e; }
        return r.json();
      }).then(function (json) { return json.result; });
  }

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

  function getInstalledApp(conn, appSysId) {
    return deployFetch('/api/now/table/sys_app', {
      sysparm_query: 'sys_id=' + appSysId, sysparm_fields: 'sys_id,name,version,scope', sysparm_limit: '1',
    }, conn).then(function (rows) {
      return (rows && rows[0]) || null;
    }).catch(function () { return null; });
  }

  function getScopeOccupant(conn, scope) {
    var s = String(scope || '').trim();
    if (!s) { return Promise.resolve(null); }
    return deployFetch('/api/now/table/sys_scope', {
      sysparm_query: 'scope=' + s, sysparm_fields: 'sys_id,scope,name', sysparm_limit: '1',
    }, conn).then(function (rows) {
      return (rows && rows[0]) || null;
    });
  }

  root.SNDeploymentPackager.instance = {
    deployFetch: deployFetch,
    detectCompanyPrefix: detectCompanyPrefix,
    getInstalledApp: getInstalledApp,
    getScopeOccupant: getScopeOccupant,
  };
})(typeof self !== 'undefined' ? self : this);
