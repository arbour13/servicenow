['$http', '$q', function ($http, $q) {
  'use strict';

  // Detects whether this page is served from inside a ServiceNow instance (deployed as a Service
  // Portal widget) rather than run standalone. g_ck is the per-session user token present on
  // every instance page - the primary signal, since it also covers custom/vanity domains. The
  // hostname check is a fallback for out-of-the-box *.service-now.com origins.
  function instanceHost() {
    var token = (typeof window.g_ck === 'string' && window.g_ck) ? window.g_ck : '';
    var h = (window.location.hostname || '').toLowerCase();
    var snDomain = /\.service-now\.com$/.test(h) || /\.servicenowservices\.com$/.test(h);
    if (token || snDomain) { return { origin: window.location.origin, token: token }; }
    return null;
  }

  // conn: {instanceUrl, username, password}. Returns a promise of the Table/Stats API's `result`.
  function apiFetch(path, params, conn) {
    var host = instanceHost();
    var url, config;
    if (host) {
      url = path;
      config = { params: params, withCredentials: true, headers: {} };
      if (host.token) { config.headers['X-UserToken'] = host.token; }
    } else {
      var base = ((conn && conn.instanceUrl) || '').replace(/\/$/, '');
      url = base + path;
      config = {
        params: params,
        headers: { Authorization: 'Basic ' + btoa(((conn && conn.username) || '') + ':' + ((conn && conn.password) || '')) },
      };
    }
    return $http.get(url, config).then(function (resp) { return resp.data.result; })
      .catch(function (resp) {
        var e = new Error('HTTP ' + resp.status + ' ' + (resp.statusText || ''));
        if (resp.status > 0) { e.httpStatus = resp.status; }
        return $q.reject(e);
      });
  }

  function testConnection(conn) {
    return apiFetch('/api/now/table/sys_user', { sysparm_limit: '1', sysparm_fields: 'sys_id' }, conn);
  }

  // fetch()/$http surface a CORS failure and a DNS/network failure identically (a generic error
  // with no HTTP status - a browser security measure), so any error without an httpStatus is
  // treated as "probably CORS/network" for messaging purposes.
  function formatConnError(e) {
    if (e && e.httpStatus) {
      if (e.httpStatus === 401) { return 'Login failed (401) - check the username and password.'; }
      if (e.httpStatus === 403) { return 'Forbidden (403) - this user may lack access to the Table API.'; }
      return e.message;
    }
    return "Couldn't reach the instance. Most likely causes: the instance URL is wrong, or your instance admin hasn't added a CORS Rule allowing this page's origin yet.";
  }

  return {
    instanceHost: instanceHost,
    apiFetch: apiFetch,
    testConnection: testConnection,
    formatConnError: formatConnError,
  };
}]