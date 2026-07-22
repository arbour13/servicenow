['$rootScope', 'ConnectionService', function ($rootScope, ConnectionService) {
  'use strict';

  // Credentials persist across reloads (localStorage) - scoped to just the connection, not the rest
  // of the form state. Live connection status never persists - it always starts 'disconnected' and
  // is re-established (or auto-reconnected) fresh each load.
  var CONN_KEY = 'glideStudioAngular_connection';
  var statusText = '';

  var svc = {
    connection: { instanceUrl: '', username: '', password: '', status: 'disconnected' },
  };
  try {
    var saved = JSON.parse(localStorage.getItem(CONN_KEY) || 'null');
    if (saved) { svc.connection.instanceUrl = saved.instanceUrl || ''; svc.connection.username = saved.username || ''; svc.connection.password = saved.password || ''; }
  } catch (e) {}

  function saveConn() {
    try { localStorage.setItem(CONN_KEY, JSON.stringify({ instanceUrl: svc.connection.instanceUrl, username: svc.connection.username, password: svc.connection.password })); } catch (e) {}
  }
  // Exposed for Reset Form: it clears every OTHER piece of app state but explicitly keeps the
  // connection, so it needs a way to re-persist just the credentials without reaching into this
  // service's private CONN_KEY/localStorage details itself.
  svc.saveCredentials = saveConn;

  function applyResult(promise, connectedText) {
    promise.then(function () {
      svc.connection.status = 'connected';
      statusText = connectedText;
      $rootScope.$broadcast('gs:connectionChanged', 'connected');
      $rootScope.$applyAsync(function () {});
    }, function (e) {
      svc.connection.status = 'error';
      statusText = ConnectionService.formatConnError(e);
      $rootScope.$applyAsync(function () {});
    });
  }

  svc.statusText = function () { return statusText; };
  svc.label = function () {
    if (svc.connection.status === 'connected') {
      return 'Connected to ' + svc.connection.instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    if (svc.connection.status === 'connecting') { return 'Connecting…'; }
    if (svc.connection.status === 'error') { return 'Connection error'; }
    return 'Not connected';
  };

  // Clearing the instance URL means there's no connection to speak of any more - clear the
  // credentials that went with it and drop any stale 'error'/'connecting' status so the working
  // context bar reads "Not connected" instead of hanging onto a failed attempt against a URL that's
  // no longer there. Persisted immediately so a reload doesn't bring the old creds back.
  svc.onUrlEdit = function () {
    if (svc.connection.instanceUrl) { return; }
    svc.connection.username = '';
    svc.connection.password = '';
    svc.connection.status = 'disconnected';
    statusText = '';
    saveConn();
  };

  svc.connect = function () {
    if (!svc.connection.instanceUrl || !svc.connection.username || !svc.connection.password) {
      statusText = 'Enter an instance URL, username, and password first.';
      return;
    }
    svc.connection.status = 'connecting';
    statusText = 'Connecting…';
    saveConn();
    applyResult(ConnectionService.testConnection(svc.connection), 'Connected as ' + svc.connection.username + '.');
  };
  // Ends the active session only - credentials stay remembered for next time. Clear the fields
  // directly to actually forget them.
  svc.disconnect = function () {
    svc.connection.status = 'disconnected';
    statusText = 'Disconnected.';
    $rootScope.$broadcast('gs:connectionChanged', 'disconnected');
  };

  var instanceHost = ConnectionService.instanceHost();
  svc.instanceHosted = !!instanceHost;
  svc.pageOrigin = window.location.origin;
  if (instanceHost) {
    // Hosted inside a ServiceNow instance (deployed widget) - use its own session automatically, no
    // manual connect flow. See ConnectionService.instanceHost/apiFetch's same-origin branch.
    svc.connection.instanceUrl = instanceHost.origin;
    svc.connection.status = 'connecting';
    applyResult(ConnectionService.testConnection(svc.connection), 'Connected to ' + instanceHost.origin.replace(/^https?:\/\//, '') + '.');
  } else if (svc.connection.instanceUrl && svc.connection.username && svc.connection.password) {
    // Standalone build with remembered credentials - pick the connection back up automatically
    // instead of making the user click Connect every visit.
    svc.connect();
  }

  return svc;
}]