/* Standalone deploy console: build/preview/download a ServiceNow Update Set for ANY app in this
   suite that has a deploy.manifest.js (see manifest.schema.md), without opening that app's own
   dev harness. Every app under apps/ is probed for a deploy.manifest.js; apps without one are
   simply not offered - see manifest.schema.md's "deploy.manifest.js" section. Framework-agnostic
   plain JS (no Angular) - this is a build-time tool, never deployed, same convention as
   snpackager.core.js. */
(function () {
  'use strict';

  var core = window.SNPackager.core;

  // Every app folder this suite currently has (mirrors ServiceNow/CLAUDE.md's apps/ listing) -
  // adding a new app means adding its folder name here so the console probes it. An app with no
  // deploy.manifest.js just comes back ineligible; nothing else has to change.
  var KNOWN_APP_FOLDERS = [
    'core', 'glide-studio', 'standards',
    'theme-generator', 'widget-studio', 'scss-mixin-generator', 'delivery-methodology',
  ];

  function appRoot(folder) { return '../../apps/' + folder + '/'; }

  // Discovery: inject deploy.manifest.js as a real <script> (same as any other provider file in
  // this suite - no fetch+eval), then check whether it registered itself. onerror covers the
  // normal "this app has no manifest" 404 case; that's not a failure to report, just "ineligible."
  function probeApp(folder) {
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = appRoot(folder) + 'deploy.manifest.js';
      script.onload = function () {
        var descriptor = window.SNAppManifests && window.SNAppManifests[folder];
        resolve({ folder: folder, descriptor: descriptor || null });
      };
      script.onerror = function () { resolve({ folder: folder, descriptor: null }); };
      document.head.appendChild(script);
    });
  }

  function fetchText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) { throw new Error('Failed to fetch ' + url + ': HTTP ' + r.status); }
      return r.text();
    });
  }

  // Fetches every source file a package needs, keyed the same way manifest.schema.md's `sources`
  // contract expects - every provider/controller/scss/index path is resolved relative to the
  // APP'S OWN ROOT, per deploy.manifest.js's contract (see manifest.schema.md).
  function loadSources(folder, descriptor) {
    var root = appRoot(folder);
    var providers = descriptor.manifest.providers || [];
    var sharedScssPartials = descriptor.sharedScssPartials || [];
    return Promise.all([
      Promise.all(providers.map(function (p) { return fetchText(root + p.file); })),
      fetchText(root + descriptor.files.controller),
      fetchText(root + descriptor.files.scss),
      fetchText(root + descriptor.files.index),
      Promise.all(sharedScssPartials.map(function (f) { return fetchText(root + f); })),
    ]).then(function (results) {
      var providerSrcs = {};
      providers.forEach(function (p, i) { providerSrcs[p.file] = results[0][i]; });
      return {
        controllerSrc: results[1],
        scssSrc: results[2],
        sharedScss: results[4].join('\n'),
        indexHtml: results[3],
        providerSrcs: providerSrcs,
        serverScript: descriptor.serverScriptSource,
      };
    });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function nowStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  // Concatenates every provider's extracted script into one reviewable blob - same presentation
  // Glide Studio's own Deploy modal uses for its "Services" tab (not part of the shared core,
  // since it's specific to how a review UI reads a package, not to assembling one).
  function formatProviders(providers) {
    return (providers || []).map(function (p) {
      var header = p.name + ' (' + p.type + ') — ' + p.file;
      var rule = new Array(header.length + 1).join('=');
      return '/* ' + rule + '\n   ' + header + '\n   ' + rule + ' */\n' + p.script;
    }).join('\n\n');
  }

  /* ---------------------------------- DOM wiring ---------------------------------- */

  var appSelect = document.getElementById('appSelect');
  var ineligibleNote = document.getElementById('ineligibleNote');
  var discoveryStatus = document.getElementById('discoveryStatus');
  var buildStatus = document.getElementById('buildStatus');
  var connectionSection = document.getElementById('connectionSection');
  var fldInstanceUrl = document.getElementById('fldInstanceUrl');
  var fldUsername = document.getElementById('fldUsername');
  var fldPassword = document.getElementById('fldPassword');
  var detectPrefixBtn = document.getElementById('detectPrefixBtn');
  var detectStatus = document.getElementById('detectStatus');
  var scopeHint = document.getElementById('scopeHint');
  var overridesSection = document.getElementById('overridesSection');
  var fldAppName = document.getElementById('fldAppName');
  var fldScope = document.getElementById('fldScope');
  var fldVersion = document.getElementById('fldVersion');
  var tabsSection = document.getElementById('tabsSection');
  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
  var outputArea = document.getElementById('outputArea');
  var sysIdSummary = document.getElementById('sysIdSummary');
  var copyBtn = document.getElementById('copyBtn');
  var downloadBtn = document.getElementById('downloadBtn');

  var eligibleApps = {};    // folder -> descriptor
  var currentFolder = null;
  var currentParts = null;  // buildParts() result, cached per app selection
  var currentXml = '';
  var activeTab = 'xml';
  var tabText = { xml: '', template: '', client: '', server: '', services: '', css: '', link: '' };

  // Only meaningful for apps with deployOptions.showConnection - scopeAuto tracks whether Scope
  // should keep recomputing from App name/detected company code (true until the user edits Scope
  // by hand, mirroring Glide Studio's own Deploy modal - see deploy-modal.service.js).
  var connState = { scopeAuto: true, companyCode: '' };

  function connStorageKey(folder) { return 'snDeployConsole_conn_' + folder; }
  function loadSavedConn(folder) {
    try { return JSON.parse(localStorage.getItem(connStorageKey(folder)) || 'null'); } catch (e) { return null; }
  }
  function saveConn(folder) {
    try {
      localStorage.setItem(connStorageKey(folder), JSON.stringify({
        instanceUrl: fldInstanceUrl.value, username: fldUsername.value, password: fldPassword.value,
      }));
    } catch (e) {}
  }

  function setStatus(el, text, isError) {
    el.textContent = text;
    el.className = 'status' + (isError ? ' status-error' : '');
  }

  function populateDropdown() {
    var folders = Object.keys(eligibleApps).sort();
    appSelect.innerHTML = '<option value="">Select an app…</option>' + folders.map(function (f) {
      return '<option value="' + f + '">' + eligibleApps[f].manifest.appName + ' (' + f + ')</option>';
    }).join('');
    appSelect.disabled = folders.length === 0;
  }

  function renderIneligible(ineligibleFolders) {
    if (!ineligibleFolders.length) { ineligibleNote.textContent = ''; return; }
    ineligibleNote.textContent = 'Not deployable (no deploy.manifest.js): ' + ineligibleFolders.join(', ');
  }

  function runDiscovery() {
    setStatus(discoveryStatus, 'Checking ' + KNOWN_APP_FOLDERS.length + ' apps for a deploy.manifest.js…', false);
    return Promise.all(KNOWN_APP_FOLDERS.map(probeApp)).then(function (results) {
      var ineligible = [];
      results.forEach(function (r) {
        if (r.descriptor) { eligibleApps[r.folder] = r.descriptor; }
        else { ineligible.push(r.folder); }
      });
      populateDropdown();
      renderIneligible(ineligible);
      var eligibleCount = Object.keys(eligibleApps).length;
      setStatus(discoveryStatus, eligibleCount + ' of ' + KNOWN_APP_FOLDERS.length + ' apps are deployable.', false);
    });
  }

  function setActiveTab(tab) {
    activeTab = tab;
    tabButtons.forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    outputArea.value = tabText[tab] || '';
  }

  function rebuildXmlTab() {
    if (!currentParts) { return; }
    var manifest = {};
    for (var k in currentParts.manifest) { if (Object.prototype.hasOwnProperty.call(currentParts.manifest, k)) { manifest[k] = currentParts.manifest[k]; } }
    manifest.appName = fldAppName.value.trim() || manifest.appName;
    manifest.scope = fldScope.value.trim() || manifest.scope;
    manifest.version = fldVersion.value.trim() || manifest.version;
    currentXml = core.assembleXml(manifest, currentParts.parts, { stamp: nowStamp() });
    tabText.xml = currentXml;
    if (activeTab === 'xml') { outputArea.value = currentXml; }

    var ids = core.deriveSysIds(manifest);
    var allSysIds = Object.keys(ids).map(function (k) { return ids[k]; })
      .concat((manifest.providers || []).map(function (p) { return core.stableSysId(manifest.sysIdPrefix, p.name); }))
      .concat((manifest.stubProviders || []).map(function (n) { return core.stableSysId(manifest.sysIdPrefix, n); }));
    var dupes = allSysIds.filter(function (id, i) { return allSysIds.indexOf(id) !== i; });
    sysIdSummary.textContent = allSysIds.length + ' unique sys_ids' + (dupes.length ? ' — WARNING: ' + dupes.length + ' duplicate(s)!' : '') + ', scope ' + manifest.scope;
  }

  function onAppSelected() {
    var folder = appSelect.value;
    tabsSection.style.display = 'none';
    overridesSection.style.display = 'none';
    connectionSection.style.display = 'none';
    currentParts = null;
    if (!folder) { setStatus(buildStatus, '', false); return; }

    currentFolder = folder;
    var descriptor = eligibleApps[folder];
    setStatus(buildStatus, 'Fetching sources for ' + descriptor.manifest.appName + '…', false);

    connState = { scopeAuto: true, companyCode: '' };
    scopeHint.textContent = '';
    detectStatus.textContent = '';
    var showConnection = !!(descriptor.deployOptions && descriptor.deployOptions.showConnection);
    connectionSection.style.display = showConnection ? '' : 'none';
    if (showConnection) {
      var saved = loadSavedConn(folder);
      fldInstanceUrl.value = (saved && saved.instanceUrl) || '';
      fldUsername.value = (saved && saved.username) || '';
      fldPassword.value = (saved && saved.password) || '';
    }

    loadSources(folder, descriptor).then(function (sources) {
      var parts = core.buildParts(descriptor.manifest, sources, {});
      currentParts = { manifest: descriptor.manifest, parts: parts };

      fldAppName.value = descriptor.manifest.appName;
      fldScope.value = descriptor.manifest.scope;
      fldVersion.value = descriptor.manifest.version || '1.0.0';

      tabText.template = parts.template;
      tabText.client = parts.clientScript;
      tabText.server = parts.serverScript;
      tabText.services = formatProviders(parts.providers);
      tabText.css = parts.css;
      tabText.link = parts.link;
      rebuildXmlTab();

      overridesSection.style.display = '';
      tabsSection.style.display = '';
      setActiveTab('xml');
      setStatus(buildStatus, 'Built ' + descriptor.manifest.appName + ' successfully.', false);
    }).catch(function (err) {
      setStatus(buildStatus, 'Build failed: ' + err.message, true);
    });
  }

  function currentlyShowsConnection() {
    var descriptor = currentFolder && eligibleApps[currentFolder];
    return !!(descriptor && descriptor.deployOptions && descriptor.deployOptions.showConnection);
  }

  function recommendedScope() {
    return core.deriveScope(fldAppName.value, connState.companyCode);
  }

  function onAppNameInput() {
    if (currentlyShowsConnection() && connState.scopeAuto) {
      fldScope.value = recommendedScope();
    }
    rebuildXmlTab();
  }

  function onScopeInput() {
    if (currentlyShowsConnection()) {
      connState.scopeAuto = false; // the user has taken manual control
      scopeHint.textContent = '';
    }
    rebuildXmlTab();
  }

  function onDetectPrefix() {
    if (!fldInstanceUrl.value.trim() || !fldUsername.value.trim() || !fldPassword.value) {
      detectStatus.textContent = 'Enter the target instance URL, username, and password first.';
      return;
    }
    detectStatus.textContent = 'Detecting…';
    var conn = { instanceUrl: fldInstanceUrl.value, username: fldUsername.value, password: fldPassword.value };
    saveConn(currentFolder);
    window.SNPackager.browserConnect.detectCompanyPrefix(conn).then(function (code) {
      if (!code) { detectStatus.textContent = "Connected, but couldn't read a vendor prefix - set Scope by hand below."; return; }
      connState.companyCode = code;
      connState.scopeAuto = true;
      fldScope.value = recommendedScope();
      scopeHint.textContent = '· detected from ' + fldInstanceUrl.value.replace(/^https?:\/\//, '').replace(/\/$/, '');
      var truncated = recommendedScope().length >= core.SCOPE_MAX;
      detectStatus.textContent = 'Prefix detected: x_' + code + (truncated ? ' (app name shortened to fit 18 chars)' : '');
      rebuildXmlTab();
    }).catch(function (e) {
      detectStatus.textContent = 'Connection failed: ' + ((e && e.message) || e);
    });
  }

  appSelect.addEventListener('change', onAppSelected);
  fldAppName.addEventListener('input', onAppNameInput);
  fldScope.addEventListener('input', onScopeInput);
  fldVersion.addEventListener('input', rebuildXmlTab);
  detectPrefixBtn.addEventListener('click', onDetectPrefix);
  [fldInstanceUrl, fldUsername, fldPassword].forEach(function (el) {
    el.addEventListener('input', function () { saveConn(currentFolder); });
  });
  tabButtons.forEach(function (b) { b.addEventListener('click', function () { setActiveTab(b.dataset.tab); }); });

  copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(outputArea.value).then(function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(function () { copyBtn.textContent = original; }, 1200);
    });
  });
  downloadBtn.addEventListener('click', function () {
    if (!currentFolder) { return; }
    var ext = activeTab === 'xml' ? 'xml' : (activeTab === 'css' ? 'css' : (activeTab === 'template' ? 'html' : 'js'));
    var blob = new Blob([outputArea.value], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = currentFolder + '-' + activeTab + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  runDiscovery();
})();
