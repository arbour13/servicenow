/* The Deploy modal's state and orchestration - the UI for packaging this app as an installable
   scoped application. The actual package assembly (fetching source, building the XML, prefix
   detection) lives in DeployService; this owns the modal itself: its form state, tab/view switching,
   target-instance prefix-detection wiring, and copy/download. Focus management (save on open, focus
   Copy once rendered, restore on close) is the core-modal directive's job, not this service's - see
   index.html's modal-overlay for that wiring. Pulled out of MainController, which exposes this
   singleton as vm.deployUi for the template to bind to.

   Dev-harness-only: the Deploy button is hidden when the app runs inside an instance
   (ng-if="!vm.instanceHosted"), so none of this runs in the deployed widget. It is deliberately NOT
   packaged as a provider - see DeployService.DEPLOYED_STUB_PROVIDERS for the empty stub that
   satisfies the deployed controller's injector instead. */
angular.module('glideStudio').factory('DeployModalService', [
  '$rootScope', 'DeployService', 'ConnectionService',
  function ($rootScope, DeployService, ConnectionService) {
    'use strict';

    // Deploy-target credentials persist (like the Settings connection's); the rest of the form
    // doesn't - the same "remember credentials, not full form state" pattern used for the connection.
    var DEPLOY_CONN_KEY = 'glideStudioAngular_deployConnection';

    var ui = {
      deploy: { appName: 'Glide Studio', scope: 'x_glide_studio_ng', version: '1.0.0', scopeAuto: true, companyCode: '', instanceUrl: '', username: '', password: '' },
      modal: { open: false },
      // Which piece the modal's code pane is showing: the full package XML, one decoded sp_widget
      // field (template/client/server/css/link), or 'services' - every sp_angular_provider
      // concatenated, so all of this app's logic is reviewable before import instead of only visible
      // buried in Package XML CDATA.
      view: 'xml',
      views: [
        { key: 'xml', label: 'Package XML' },
        { key: 'template', label: 'Template' },
        { key: 'client', label: 'Client' },
        { key: 'server', label: 'Server' },
        { key: 'services', label: 'Services' },
        { key: 'css', label: 'CSS' },
        { key: 'link', label: 'Link' },
      ],
      tabText: '',
      status: '',
      detectStatus: '',
      scopeHint: '',
      copyStatus: 'Copy',
    };

    try {
      var savedDeployConn = JSON.parse(localStorage.getItem(DEPLOY_CONN_KEY) || 'null');
      if (savedDeployConn) { ui.deploy.instanceUrl = savedDeployConn.instanceUrl || ''; ui.deploy.username = savedDeployConn.username || ''; ui.deploy.password = savedDeployConn.password || ''; }
    } catch (e) {}
    function saveDeployConn() {
      try { localStorage.setItem(DEPLOY_CONN_KEY, JSON.stringify({ instanceUrl: ui.deploy.instanceUrl, username: ui.deploy.username, password: ui.deploy.password })); } catch (e) {}
    }

    // Fetched once per modal-open (see open()) and cached - every field/tab interaction after that
    // re-assembles synchronously from this, so edits feel instant instead of re-fetching each time.
    // null while loading or before the modal's first open this session.
    var deployParts = null;

    // Per-tab filename/MIME for the Download button.
    var FILE_META = {
      xml: { file: 'glide_studio_ng_app.xml', mime: 'application/xml' },
      template: { file: 'template.html', mime: 'text/html' },
      client: { file: 'client_script.js', mime: 'text/javascript' },
      server: { file: 'server_script.js', mime: 'text/javascript' },
      services: { file: 'services.js', mime: 'text/javascript' },
      css: { file: 'widget.scss', mime: 'text/css' },
      link: { file: 'link.js', mime: 'text/javascript' },
    };

    function download(text, filename, mime) {
      if (!text) { return; }
      var blob = new Blob([text], { type: mime || 'text/javascript' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function regenView() {
      if (!deployParts) { return; }
      if (ui.view === 'xml') {
        ui.tabText = DeployService.assembleXml(deployParts, ui.deploy);
      } else if (ui.view === 'link') {
        ui.tabText = deployParts.link || '/* This widget has no link function - all logic lives in the client script / injected services. */';
      } else if (ui.view === 'services') {
        ui.tabText = DeployService.formatProviders(deployParts.providers);
      } else {
        var map = { template: deployParts.template, client: deployParts.clientScript, server: deployParts.serverScript, css: deployParts.css };
        ui.tabText = map[ui.view];
      }
    }

    // Recommended scope from the App name (+ any detected company code), always within the 18-char
    // cap via DeployService.deriveScope - keeps the Scope field auto-tracking the App name (and, once
    // detected, the target instance's own vendor prefix) while scopeAuto is true.
    function recommendedScope() { return DeployService.deriveScope(ui.deploy.appName, ui.deploy.companyCode || ''); }
    function applyScope(scope, auto) {
      ui.deploy.scope = String(scope || '').slice(0, DeployService.SCOPE_MAX);
      ui.deploy.scopeAuto = auto;
      regenView();
    }

    ui.setView = function (key) { ui.view = key; regenView(); };
    ui.recommendedScope = recommendedScope;
    ui.onAppNameEdit = function () {
      // While the scope is still auto, keep it tracking the recommended id from the app name.
      if (ui.deploy.scopeAuto) { ui.deploy.scope = recommendedScope(); }
      regenView();
    };
    ui.onFieldEdit = function () { regenView(); saveDeployConn(); };
    ui.onScopeEdit = function () {
      ui.deploy.scope = (ui.deploy.scope || '').slice(0, DeployService.SCOPE_MAX);
      ui.deploy.scopeAuto = false; // the user has taken control of the scope
      ui.scopeHint = '';
      regenView();
    };
    ui.detectPrefix = function () {
      if (!ui.deploy.instanceUrl || !ui.deploy.username || !ui.deploy.password) {
        ui.detectStatus = 'Enter the target instance URL, username, and password first.';
        return;
      }
      ui.detectStatus = 'Detecting…';
      DeployService.detectCompanyPrefix(ui.deploy).then(function (code) {
        $rootScope.$applyAsync(function () {
          if (!code) { ui.detectStatus = "Connected, but couldn't read a vendor prefix - set the Scope by hand below."; return; }
          ui.deploy.companyCode = code;
          applyScope(recommendedScope(), true);
          ui.scopeHint = '· detected from ' + ui.deploy.instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          var truncated = recommendedScope().length >= DeployService.SCOPE_MAX;
          ui.detectStatus = 'Prefix detected: x_' + code + '_' + (truncated ? ' (app name shortened to fit 18 chars)' : '');
        });
      }).catch(function (e) {
        $rootScope.$applyAsync(function () { ui.detectStatus = ConnectionService.formatConnError(e); });
      });
    };
    ui.open = function () {
      ui.view = 'xml';
      ui.deploy.scope = String(ui.deploy.scope || '').slice(0, DeployService.SCOPE_MAX);
      ui.scopeHint = '';
      ui.detectStatus = '';
      ui.tabText = '';
      ui.status = deployParts ? '' : 'Building package…';
      ui.modal.open = true;
      if (deployParts) { regenView(); return; }
      DeployService.buildParts().then(function (parts) {
        $rootScope.$applyAsync(function () {
          deployParts = parts;
          ui.status = '';
          regenView();
        });
      }).catch(function (e) {
        $rootScope.$applyAsync(function () { ui.status = 'Failed to build package: ' + (e && e.message || e); });
      });
    };
    ui.close = function () { ui.modal.open = false; };
    ui.copyTab = function () {
      if (!ui.tabText || !navigator.clipboard || !navigator.clipboard.writeText) { return; }
      navigator.clipboard.writeText(ui.tabText).then(function () {
        $rootScope.$applyAsync(function () {
          ui.copyStatus = 'Copied ✓';
          setTimeout(function () { $rootScope.$applyAsync(function () { ui.copyStatus = 'Copy'; }); }, 1300);
        });
      });
    };
    ui.downloadTab = function () {
      var meta = FILE_META[ui.view];
      download(ui.tabText, meta.file, meta.mime);
    };

    return ui;
  }
]);
