/* Connection to a live TARGET ServiceNow instance: Basic-Auth calls used to detect that instance's
   application vendor prefix, look up whether an app is already installed there, and (see
   publishUpdateSet below) publish a built Update Set straight onto it via the Table API.

   publishUpdateSet is the one thing here that WRITES - everything else is read-only. It stops at
   landing the Update Set in the target's own Retrieved Update Sets list; it does NOT commit it.
   ServiceNow's real Commit action is an internal GlideAjax-callable script tied to a logged-in
   browser session (CSRF tokens, session-specific plumbing) - not a stable, documented REST endpoint
   the way Table API is - so it isn't something this tool can reliably automate the way the reads
   and the publish-write below are. Committing stays a manual step in the target instance's own UI,
   which is also the last chance to review the diff before it actually applies.

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

  // Looks up whether ANY application/scope already uses this scope string on the target instance.
  // Resolves to {sys_id, scope, name} if taken, or null if free. Rejects on network/auth failure so
  // callers can fail closed when uniqueness must be guaranteed (e.g. before upload).
  function getScopeOccupant(conn, scope) {
    var s = String(scope || '').trim();
    if (!s) { return Promise.resolve(null); }
    return deployFetch('/api/now/table/sys_scope', {
      sysparm_query: 'scope=' + s, sysparm_fields: 'sys_id,scope,name', sysparm_limit: '1',
    }, conn).then(function (rows) {
      return (rows && rows[0]) || null;
    });
  }

  // Inserts or updates ONE record via the Table API, keyed by an explicit sys_id. Existence is
  // checked with a plain GET first rather than relying on POST-with-a-preset-sys_id as an upsert -
  // that behavior isn't consistent enough across ServiceNow versions to trust for a write path -
  // then PATCHes (already there) or POSTs (fresh) accordingly.
  function writeRecord(conn, table, sysId, fields) {
    var c = connBase(conn);
    return deployFetch('/api/now/table/' + table, {
      sysparm_query: 'sys_id=' + sysId, sysparm_fields: 'sys_id', sysparm_limit: '1',
    }, conn).then(function (rows) { return !!(rows && rows[0]); }).then(function (exists) {
      var url = c.base + '/api/now/table/' + table + (exists ? '/' + sysId : '');
      return fetch(url, {
        method: exists ? 'PATCH' : 'POST',
        headers: { 'Authorization': c.authHeader, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      }).then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            var e = new Error('HTTP ' + r.status + ' writing ' + table + ': ' + t.slice(0, 300));
            e.httpStatus = r.status;
            throw e;
          });
        }
        return r.json().then(function (json) { return { table: table, sysId: sysId, action: exists ? 'updated' : 'inserted', result: json.result }; });
      });
    });
  }

  // Publishes an already-built Update Set record list (core.js's wrapAsUpdateSet output, each
  // record's fields already run through core.js's recordToApiFields) straight onto the target
  // instance's Retrieved Update Sets via the Table API - the header (sys_remote_update_set) first,
  // since every sys_update_xml wrapper references it, then each wrapper in order. Writes happen ONE
  // AT A TIME sequentially, not in parallel, so a failure partway through stops immediately with a
  // clear count of what actually landed, rather than firing the rest out of order regardless.
  //
  // Deliberately stops here - does NOT commit. See this file's header comment for why: ServiceNow's
  // real Commit action isn't a stable, externally-callable REST endpoint the way Table API is.
  // Resolves to the list of {table, sysId, action, result} writes that succeeded before either
  // finishing or throwing - a caller can report partial progress either way.
  function publishUpdateSet(conn, records) {
    var written = [];
    return records.reduce(function (chain, rec) {
      return chain.then(function () {
        return writeRecord(conn, rec.table, rec.sysId, rec.apiFields).then(function (result) {
          written.push(result);
          return written;
        });
      });
    }, Promise.resolve(written)).catch(function (e) {
      e.written = written;
      throw e;
    });
  }

  root.SNDeploymentPackager.instance = {
    deployFetch: deployFetch, detectCompanyPrefix: detectCompanyPrefix, getInstalledApp: getInstalledApp,
    getScopeOccupant: getScopeOccupant, writeRecord: writeRecord, publishUpdateSet: publishUpdateSet,
  };
})(typeof self !== 'undefined' ? self : this);
