/* Standalone SDK-only deploy console: build and deploy a Fluent (Now SDK) project for ANY app in
   this suite that has a deploy.manifest.js (see manifest.schema.md), without opening that app's own
   dev harness. Every app under apps/ is probed for a deploy.manifest.js; apps without one are
   simply not offered - see manifest.schema.md's "deploy.manifest.js" section. Framework-agnostic
   plain JS (no Angular) - this is a build-time tool, never deployed, same convention as core.js.

   SDK-only: this console no longer emits or downloads Update Set XML. It always builds the Fluent
   project (fluent.js's assembleFluent) and ships it to the target instance via the local
   sdk-bridge.js (Now SDK auth + build + install), which streams progress back as NDJSON into the
   Deploy modal. Review and edit app source in VS Code + the app's local harness; this console only
   packages and deploys. */
(function () {
  'use strict';

  var core = window.SNDeploymentPackager.core;
  var fluent = window.SNDeploymentPackager.fluent;
  var semver = window.SNDeploymentPackager.semver;

  // Every app folder this suite currently has (mirrors ServiceNow/CLAUDE.md's apps/ listing) -
  // adding a new app means adding its folder name here so the console probes it. An app with no
  // deploy.manifest.js just comes back ineligible; nothing else has to change.
  var KNOWN_APP_FOLDERS = [
    'glide-studio', 'docs',
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
        // deployable: false keeps the manifest on disk but hides the app from this console.
        if (descriptor && descriptor.deployable === false) { descriptor = null; }
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
  function contentModelPaths(files) {
    if (!files.contentModel) {
      return [];
    }
    return Array.isArray(files.contentModel) ? files.contentModel : [files.contentModel];
  }

  function resolveServerScript(root, descriptor, fetched) {
    var files = descriptor.files || {};
    if (files.serverScript) {
      var parts = [];
      if (fetched.contentModel) {
        parts.push(fetched.contentModel);
      }
      parts.push(fetched.serverScript);
      return parts.join('\n');
    }
    return descriptor.serverScriptSource;
  }

  function loadSources(folder, descriptor) {
    var root = appRoot(folder);
    var providers = (descriptor.manifest.providers || []).filter(function (p) {
      return p.deploy !== false;
    });
    var sharedScssPartials = descriptor.sharedScssPartials || [];
    var files = descriptor.files || {};
    var viewPartialEntries = Object.keys(files.viewPartials || {}).map(function (name) {
      return { name: name, file: files.viewPartials[name] };
    });
    // Multi-widget apps (manifest.widgets[]) have no single files.controller - each widget brings
    // its own controller, plus a template fragment for any widget declaring templatePartial/
    // templateFile (a widget with neither, the shell, falls back to files.index in buildParts).
    var widgetDefs = descriptor.manifest.widgets;
    var isMultiWidget = Array.isArray(widgetDefs) && widgetDefs.length > 0;
    var widgetTemplateFiles = isMultiWidget ? widgetDefs.map(function (w) { return w.templatePartial || w.templateFile || null; }) : [];
    var modelPaths = contentModelPaths(files);
    var fetches = [
      Promise.all(providers.map(function (p) { return fetchText(root + p.file); })),
      isMultiWidget ? Promise.resolve(null) : fetchText(root + files.controller),
      fetchText(root + files.scss),
      fetchText(root + files.index),
      Promise.all(sharedScssPartials.map(function (f) { return fetchText(root + f); })),
      Promise.all(viewPartialEntries.map(function (entry) { return fetchText(root + entry.file); })),
      isMultiWidget ? Promise.all(widgetDefs.map(function (w) { return fetchText(root + w.controller); })) : Promise.resolve([]),
      isMultiWidget ? Promise.all(widgetTemplateFiles.map(function (f) { return f ? fetchText(root + f) : Promise.resolve(null); })) : Promise.resolve([]),
    ];
    if (files.serverScript) {
      fetches.push(modelPaths.length
        ? Promise.all(modelPaths.map(function (rel) { return fetchText(root + rel); })).then(function (parts) {
          return parts.join('\n');
        })
        : Promise.resolve(''));
      fetches.push(fetchText(root + files.serverScript));
    }
    return Promise.all(fetches).then(function (results) {
      var providerSrcs = {};
      providers.forEach(function (p, i) { providerSrcs[p.file] = results[0][i]; });
      var viewPartials = {};
      viewPartialEntries.forEach(function (entry, index) {
        viewPartials[entry.name] = results[5][index];
      });
      var serverScript = files.serverScript
        ? resolveServerScript(root, descriptor, { contentModel: results[8], serverScript: results[9] })
        : descriptor.serverScriptSource;
      var sources = {
        scssSrc: results[2],
        sharedScss: results[4].join('\n'),
        indexHtml: results[3],
        viewPartials: viewPartials,
        providerSrcs: providerSrcs,
        serverScript: serverScript,
      };
      if (isMultiWidget) {
        var controllerSrcs = {};
        var templateTexts = {};
        widgetDefs.forEach(function (w, index) {
          controllerSrcs[w.id] = results[6][index];
          if (results[7][index] != null) { templateTexts[w.id] = results[7][index]; }
        });
        sources.widgets = { controllerSrcs: controllerSrcs, templateTexts: templateTexts };
      } else {
        sources.controllerSrc = results[1];
      }
      return sources;
    });
  }

  /* ---------------------------------- DOM wiring ---------------------------------- */

  var appSelect = document.getElementById('appSelect');
  var discoveryStatus = document.getElementById('discoveryStatus');
  var buildStatus = document.getElementById('buildStatus');
  var connectionSection = document.getElementById('connectionSection');
  var fldInstanceUrl = document.getElementById('fldInstanceUrl');
  var fldUsername = document.getElementById('fldUsername');
  var fldPassword = document.getElementById('fldPassword');
  var passwordWrap = document.getElementById('passwordWrap');
  var togglePasswordBtn = document.getElementById('togglePasswordBtn');
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var connectBtn = document.getElementById('connectBtn');
  var disconnectBtn = document.getElementById('disconnectBtn');
  var deploySdkBtn = document.getElementById('deploySdkBtn');
  var deploySdkBtnTip = document.getElementById('deploySdkBtnTip');
  var deployReadiness = document.getElementById('deployReadiness');
  var bridgeSection = document.getElementById('bridgeSection');
  var bridgeDot = document.getElementById('bridgeDot');
  var bridgeStatusLabel = document.getElementById('bridgeStatusLabel');
  var bridgeCheckBtn = document.getElementById('bridgeCheckBtn');
  var bridgeCopyCmdBtn = document.getElementById('bridgeCopyCmdBtn');
  var bridgeSyncBtn = document.getElementById('bridgeSyncBtn');
  var bridgeCmdWrap = document.getElementById('bridgeCmdWrap');
  var bridgeCmdText = document.getElementById('bridgeCmdText');
  var detectStatus = document.getElementById('detectStatus');
  var savedInstanceSelect = document.getElementById('savedInstanceSelect');
  var saveInstanceBtn = document.getElementById('saveInstanceBtn');
  var removeInstanceBtn = document.getElementById('removeInstanceBtn');
  var removeInstanceTip = document.getElementById('removeInstanceTip');
  var connectionHint = document.getElementById('connectionHint');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalTitle = document.getElementById('modalTitle');
  var modalBody = document.getElementById('modalBody');
  var modalFieldWrap = document.getElementById('modalFieldWrap');
  var modalInputLabel = document.getElementById('modalInputLabel');
  var modalInput = document.getElementById('modalInput');
  var modalCloseBtn = document.getElementById('modalCloseBtn');
  var modalCancelBtn = document.getElementById('modalCancelBtn');
  var modalConfirmBtn = document.getElementById('modalConfirmBtn');
  var overridesSection = document.getElementById('overridesSection');
  var fldAppName = document.getElementById('fldAppName');
  var fldScopePrefix = document.getElementById('fldScopePrefix');
  var fldScopeName = document.getElementById('fldScopeName');
  var scopeCompound = document.getElementById('scopeCompound');
  var fldVersion = document.getElementById('fldVersion');
  var versionTipHost = document.getElementById('versionTipHost');
  var outputSection = document.getElementById('outputSection');
  var outputEditorHost = document.getElementById('outputEditor');
  var outputFallback = document.getElementById('outputFallback');
  var scopeStatus = document.getElementById('scopeStatus');
  var fluentControls = document.getElementById('fluentControls');
  var fluentFileSelect = document.getElementById('fluentFileSelect');
  var deployModalOverlay = document.getElementById('deployModalOverlay');
  var deployModalStatus = document.getElementById('deployModalStatus');
  var deployProgressFill = document.getElementById('deployProgressFill');
  var deployProgressLog = document.getElementById('deployProgressLog');
  var deployModalDoneBtn = document.getElementById('deployModalDoneBtn');

  var eligibleApps = {};    // folder -> descriptor
  var currentFolder = null;
  var currentParts = null;  // buildParts() result, cached per app selection

  var fluentFiles = {};        // { path: contents } for the current Fluent build
  var fluentActivePath = '';   // which generated file the editor is showing
  var outputEditor = null;     // Monaco instance once loaded
  var pendingOutput = { text: '', language: 'typescript' };

  // Semver suggestion state - see applyVersionSuggestion() below.
  var priorFluentFiles = {};        // last known Fluent snapshot (disk or in-memory), diffed on rebuild
  var installedBaseVersion = null;  // version found on the connected instance via Connect, else null
  var versionDirty = false;         // true once the user has hand-edited fldVersion this app session

  function languageForPath(path) {
    var p = String(path || '').toLowerCase();
    if (/\.xml$/.test(p)) { return 'xml'; }
    if (/\.json$/.test(p)) { return 'json'; }
    if (/\.html?$/.test(p)) { return 'html'; }
    if (/\.scss$/.test(p) || /\.css$/.test(p)) { return 'scss'; }
    if (/\.tsx?$/.test(p)) { return 'typescript'; }
    if (/\.jsx?$/.test(p) || /\.mjs$/.test(p) || /\.cjs$/.test(p)) { return 'javascript'; }
    return 'plaintext';
  }

  function defineOutputThemes(monaco) {
    monaco.editor.defineTheme('sn-packager-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#fbfbfd',
        'editor.foreground': '#1c2128',
        'editorLineNumber.foreground': '#9aa1ab',
        'editorLineNumber.activeForeground': '#6b7280',
        'editorCursor.foreground': '#054b80',
        'editor.selectionBackground': '#d6e6f2',
        'editor.inactiveSelectionBackground': '#e6eef5',
        'editorIndentGuide.background': '#e2e5ea',
        'editorIndentGuide.activeBackground': '#d2d6dd',
        'scrollbarSlider.background': '#d2d6dd88',
        'scrollbarSlider.hoverBackground': '#d2d6ddcc',
      },
    });
    monaco.editor.defineTheme('sn-packager-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#20262f',
        'editor.foreground': '#e7ebf2',
        'editorLineNumber.foreground': '#6b7385',
        'editorLineNumber.activeForeground': '#9aa3b6',
        'editorCursor.foreground': '#5b9fe0',
        'editor.selectionBackground': '#2f6f9e66',
        'editor.inactiveSelectionBackground': '#2f6f9e33',
        'editorIndentGuide.background': '#2a3040',
        'editorIndentGuide.activeBackground': '#3b4353',
        'scrollbarSlider.background': '#3b435388',
        'scrollbarSlider.hoverBackground': '#3b4353cc',
      },
    });
  }

  function currentEditorTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'sn-packager-dark'
      : 'sn-packager-light';
  }

  function syncEditorTheme() {
    if (!outputEditor || !window.monaco) { return; }
    window.monaco.editor.setTheme(currentEditorTheme());
  }

  function setOutputContent(text, language) {
    pendingOutput = { text: text || '', language: language || 'typescript' };
    outputFallback.value = pendingOutput.text;
    if (!outputEditor) { return; }
    var model = outputEditor.getModel();
    if (model && window.monaco) {
      window.monaco.editor.setModelLanguage(model, pendingOutput.language);
    }
    if (outputEditor.getValue() !== pendingOutput.text) {
      outputEditor.setValue(pendingOutput.text);
    }
  }

  function useOutputFallback() {
    outputEditor = null;
    outputEditorHost.hidden = true;
    outputFallback.hidden = false;
    outputFallback.value = pendingOutput.text;
  }

  function createOutputEditor() {
    if (!window.monaco || outputEditor) { return; }
    defineOutputThemes(window.monaco);
    outputFallback.hidden = true;
    outputEditorHost.hidden = false;
    outputEditor = window.monaco.editor.create(outputEditorHost, {
      value: pendingOutput.text,
      language: pendingOutput.language,
      theme: currentEditorTheme(),
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 12,
      fontFamily: 'SF Mono, JetBrains Mono, Fira Code, Menlo, Consolas, monospace',
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      padding: { top: 8, bottom: 8 },
      contextmenu: true,
      domReadOnly: true,
    });
  }

  function loadMonaco() {
    if (window.monaco) {
      createOutputEditor();
      return;
    }
    if (loadMonaco.loading) { return; }
    loadMonaco.loading = true;
    var BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/';
    var failed = false;
    function fail() {
      if (failed) { return; }
      failed = true;
      loadMonaco.loading = false;
      useOutputFallback();
    }
    var script = document.createElement('script');
    script.src = BASE + 'vs/loader.min.js';
    script.onload = function () {
      try {
        window.MonacoEnvironment = {
          getWorkerUrl: function () {
            return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
              "self.MonacoEnvironment={baseUrl:'" + BASE + "'};" +
              "importScripts('" + BASE + "vs/base/worker/workerMain.js');"
            );
          },
        };
        window.require.config({ paths: { vs: BASE + 'vs' } });
        window.require(['vs/editor/editor.main'], function () {
          loadMonaco.loading = false;
          createOutputEditor();
          setOutputContent(pendingOutput.text, pendingOutput.language);
        }, fail);
        setTimeout(function () { if (!window.monaco) { fail(); } }, 12000);
      } catch (e) { fail(); }
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }

  // Scope uniqueness against the live instance: 'unknown' | 'checking' | 'free' | 'own' | 'taken'.
  // 'own' = this scope already belongs to THIS app's deterministic sys_id (safe to update).
  var scopeUniqueness = 'unknown';
  var scopeCheckTimer = null;
  var ourInstalledSysId = null; // set when getInstalledApp finds this app on the target
  // True after a successful Connect against the current credentials. Credentials-in-fields alone
  // do not count - Deploy / uniqueness checks require this. Cleared by Disconnect, app switch,
  // Connect failure, or editing URL/user/password.
  var sessionConnected = false;
  // True while detect/lookup is in flight. Also set briefly before auto-Connect when saved
  // credentials are present, so the UI shows Disconnect instead of flashing Connect first.
  var connectionInFlight = false;
  // True once the user has typed in either App ID part this app session - incomplete App ID is
  // not treated as an error until then (or until Connect finishes), so the field doesn't flash
  // red while blank waiting for Connect to fill the prefix.
  var scopeUserTouched = false;
  // Localhost sdk-bridge.js (Now SDK auth/deploy handoff). Polled continuously; the browser cannot
  // start it — the status panel shows online/offline and offers Check again + a copyable start command.
  var SDK_BRIDGE = 'http://127.0.0.1:17345';
  var BRIDGE_CMD_CACHE_KEY = 'snDeployConsole_bridgeCmd_v3';
  var sdkBridgeUp = false;
  var sdkSyncedAlias = '';
  var sdkBridgePollTimer = null;
  var bridgeAuthSyncing = false;
  var bridgeCredsSynced = false;
  // When true, fldScopePrefix is read-only (set from the instance company code / existing install).
  var scopePrefixLocked = false;
  // When true, the whole scope is fixed (existing install) - name is read-only too.
  var scopeFullyLocked = false;
  function connStorageKey(folder) { return 'snDeployConsole_conn_' + folder; }
  var LAST_APP_KEY = 'snDeployConsole_lastApp';
  var SAVED_INSTANCES_KEY = 'snDeployConsole_savedInstances';
  var LAST_INSTANCE_KEY = 'snDeployConsole_lastInstanceId';

  function loadLastApp() {
    try { return localStorage.getItem(LAST_APP_KEY) || ''; } catch (e) { return ''; }
  }
  function saveLastApp(folder) {
    try {
      if (folder) { localStorage.setItem(LAST_APP_KEY, folder); }
      else { localStorage.removeItem(LAST_APP_KEY); }
    } catch (e) {}
  }
  // Per-app draft of whatever was last typed (not the named "credit card" list below).
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

  // Named saved instances - like saved payment cards: pick one later, update, or remove.
  function loadSavedInstances() {
    try {
      var list = JSON.parse(localStorage.getItem(SAVED_INSTANCES_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function persistSavedInstances(list) {
    try { localStorage.setItem(SAVED_INSTANCES_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function loadLastInstanceId() {
    try { return localStorage.getItem(LAST_INSTANCE_KEY) || ''; } catch (e) { return ''; }
  }
  function saveLastInstanceId(id) {
    try {
      if (id) { localStorage.setItem(LAST_INSTANCE_KEY, id); }
      else { localStorage.removeItem(LAST_INSTANCE_KEY); }
    } catch (e) {}
  }
  function newInstanceId() {
    return 'inst_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  function defaultInstanceName(url) {
    try {
      var host = new URL(url).hostname.replace(/\.service-now\.com$/i, '');
      return host || 'Instance';
    } catch (e) {
      return 'Instance';
    }
  }
  function refreshSavedInstanceSelect(selectId) {
    var list = loadSavedInstances();
    var selected = selectId != null ? selectId : savedInstanceSelect.value;
    savedInstanceSelect.innerHTML = list.map(function (inst) {
      return '<option value="' + inst.id + '">' + escapeHtml(inst.name) + '</option>';
    }).join('') + '<option value="">New connection…</option>';
    if (selected && list.some(function (i) { return i.id === selected; })) {
      savedInstanceSelect.value = selected;
    } else {
      savedInstanceSelect.value = '';
    }
    removeInstanceBtn.disabled = !savedInstanceSelect.value;
    setTip(removeInstanceTip, savedInstanceSelect.value
      ? 'Remove this saved connection'
      : 'Choose a saved connection to remove');
    applyConnectionFieldLock();
  }
  function applyConnectionFieldLock() {
    var editingSaved = !!savedInstanceSelect.value;
    fldInstanceUrl.readOnly = false;
    fldUsername.readOnly = false;
    fldPassword.readOnly = false;
    saveInstanceBtn.hidden = false;
    if (editingSaved) {
      saveInstanceBtn.textContent = 'Update connection';
      setTip(saveInstanceBtn, 'Save URL, username, password, and name changes to this saved connection');
      if (connectionHint) {
        connectionHint.textContent = 'Edit the fields below, then Update connection to save changes (including a new password). Connect again after updating credentials. ' +
          "Saved in this browser's local storage, including the password in plain text.";
      }
    } else {
      saveInstanceBtn.textContent = 'Save for later';
      setTip(saveInstanceBtn, 'Save these credentials as a new named connection');
      if (connectionHint) {
        connectionHint.textContent = 'To add a saved connection, leave New connection selected, fill in the fields, then click Save for later. ' +
          "Saved in this browser's local storage, including the password in plain text.";
      }
    }
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function applyInstanceFields(inst) {
    fldInstanceUrl.value = (inst && inst.instanceUrl) || '';
    fldUsername.value = (inst && inst.username) || '';
    fldPassword.value = (inst && inst.password) || '';
  }

  // Custom modal (no window.prompt / window.confirm). Resolves with:
  //   - string from the input when opts.input is set
  //   - true for a plain confirm
  //   - null when cancelled / dismissed
  // Keeps Tab/Shift+Tab cycling inside an open modal instead of escaping into the page behind the
  // overlay - wraps from the last focusable element back to the first, and vice versa. `container`
  // must already be visible (offsetParent check filters out hidden/[hidden] descendants).
  function trapTabWithin(container, e) {
    if (e.key !== 'Tab') { return; }
    var focusable = Array.prototype.slice.call(
      container.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')
    ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    // Nothing focusable yet (e.g. the deploy modal mid-stream, before Done appears) - keep Tab from
    // escaping to the page behind the overlay rather than silently doing nothing.
    if (!focusable.length) { e.preventDefault(); return; }
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  var modalResolve = null;
  function closeModal(result) {
    if (!modalResolve) { return; }
    modalOverlay.hidden = true;
    var resolve = modalResolve;
    modalResolve = null;
    document.removeEventListener('keydown', onModalKeydown, true);
    resolve(result);
  }
  function onModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal(null);
      return;
    }
    if (e.key === 'Enter' && e.target === modalInput) {
      e.preventDefault();
      acceptModal();
      return;
    }
    trapTabWithin(modalOverlay.querySelector('.modal'), e);
  }
  function acceptModal() {
    if (!modalResolve) { return; }
    if (!modalFieldWrap.hidden) {
      closeModal(modalInput.value);
      return;
    }
    closeModal(true);
  }
  function openModal(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (modalResolve) { closeModal(null); }
      modalResolve = resolve;
      modalTitle.textContent = opts.title || 'Dialog';
      modalBody.textContent = opts.body || '';
      modalBody.hidden = !opts.body;
      modalCancelBtn.textContent = opts.cancelLabel || 'Cancel';
      modalConfirmBtn.textContent = opts.confirmLabel || 'OK';
      modalConfirmBtn.className = 'modal-btn' + (opts.danger ? ' danger' : ' primary');
      modalCancelBtn.hidden = !!opts.hideCancel;
      if (opts.input) {
        modalFieldWrap.hidden = false;
        modalInputLabel.textContent = opts.inputLabel || 'Name';
        modalInput.value = opts.defaultValue != null ? opts.defaultValue : '';
        modalInput.placeholder = opts.placeholder || '';
      } else {
        modalFieldWrap.hidden = true;
        modalInput.value = '';
      }
      modalOverlay.hidden = false;
      document.addEventListener('keydown', onModalKeydown, true);
      setTimeout(function () {
        if (opts.input) { modalInput.focus(); modalInput.select(); }
        else { (opts.hideCancel ? modalConfirmBtn : modalCancelBtn).focus(); }
      }, 0);
    });
  }
  function promptModal(opts) {
    return openModal(Object.assign({ input: true, confirmLabel: 'Save' }, opts || {}));
  }
  function confirmModal(opts) {
    return openModal(Object.assign({ confirmLabel: 'Remove', danger: true }, opts || {}));
  }

  function onSavedInstanceSelected() {
    var id = savedInstanceSelect.value;
    removeInstanceBtn.disabled = !id;
    setTip(removeInstanceTip, id
      ? 'Remove this saved connection'
      : 'Choose a saved connection to remove');
    if (!id) {
      applyInstanceFields(null);
      saveLastInstanceId('');
      if (currentFolder) { saveConn(currentFolder); }
      applyConnectionFieldLock();
      if (sessionConnected) {
        disconnectSession({ message: 'Disconnected.' });
      } else {
        detectStatus.textContent = 'Enter instance details, then Connect or Save for later.';
      }
      return;
    }
    var inst = loadSavedInstances().filter(function (i) { return i.id === id; })[0];
    if (!inst) { return; }
    applyInstanceFields(inst);
    saveLastInstanceId(id);
    if (currentFolder) { saveConn(currentFolder); }
    applyConnectionFieldLock();
    if (sessionConnected) {
      disconnectSession({
        clearScope: false,
        message: 'Loaded “' + inst.name + '” - Connect again to use this connection.',
      });
    } else {
      detectStatus.textContent = 'Loaded “' + inst.name + '” - click Connect when ready.';
    }
  }
  function onSaveInstanceClick() {
    if (!fldInstanceUrl.value.trim() || !fldUsername.value.trim() || !fldPassword.value) {
      detectStatus.textContent = 'Enter instance URL, username, and password before saving.';
      return;
    }
    var selectedId = savedInstanceSelect.value;
    if (selectedId) {
      var list = loadSavedInstances();
      var existing = list.filter(function (i) { return i.id === selectedId; })[0];
      if (!existing) { return; }
      promptModal({
        title: 'Update connection',
        body: 'Save the edited URL, username, and password to “' + existing.name + '”. You can rename it below.',
        inputLabel: 'Connection name',
        defaultValue: existing.name,
        confirmLabel: 'Update',
      }).then(function (name) {
        if (name == null) { return; }
        name = String(name).trim() || existing.name;
        existing.name = name;
        existing.instanceUrl = fldInstanceUrl.value.trim();
        existing.username = fldUsername.value.trim();
        existing.password = fldPassword.value;
        persistSavedInstances(list);
        refreshSavedInstanceSelect(existing.id);
        saveLastInstanceId(existing.id);
        if (currentFolder) { saveConn(currentFolder); }
        detectStatus.textContent = 'Updated “' + existing.name + '”.';
      });
      return;
    }
    var suggested = defaultInstanceName(fldInstanceUrl.value.trim());
    promptModal({
      title: 'Save connection',
      body: 'Name this connection so you can pick it from Saved connection later.',
      inputLabel: 'Connection name',
      defaultValue: suggested,
      confirmLabel: 'Save',
    }).then(function (name) {
      if (name == null) { return; } // cancelled
      name = String(name).trim() || suggested;
      var created = {
        id: newInstanceId(),
        name: name,
        instanceUrl: fldInstanceUrl.value.trim(),
        username: fldUsername.value.trim(),
        password: fldPassword.value,
      };
      var list = loadSavedInstances();
      list.push(created);
      persistSavedInstances(list);
      refreshSavedInstanceSelect(created.id);
      saveLastInstanceId(created.id);
      applyInstanceFields(created);
      applyConnectionFieldLock();
      detectStatus.textContent = 'Saved “' + created.name + '”.';
    });
  }
  function onRemoveInstanceClick() {
    var id = savedInstanceSelect.value;
    if (!id) { return; }
    var list = loadSavedInstances();
    var inst = list.filter(function (i) { return i.id === id; })[0];
    if (!inst) { return; }
    confirmModal({
      title: 'Remove connection',
      body: 'Remove saved connection “' + inst.name + '”? This only deletes it from this browser.',
      confirmLabel: 'Remove',
    }).then(function (ok) {
      if (!ok) { return; }
      list = loadSavedInstances().filter(function (i) { return i.id !== id; });
      persistSavedInstances(list);
      if (loadLastInstanceId() === id) { saveLastInstanceId(''); }
      refreshSavedInstanceSelect('');
      applyInstanceFields(null);
      applyConnectionFieldLock();
      detectStatus.textContent = 'Removed “' + inst.name + '”.';
    });
  }

  function setStatus(el, text, isError) {
    el.textContent = text;
    el.className = 'status' + (isError ? ' status-error' : '');
  }

  // Custom tooltips via data-tip (no native title - delayed, unthemed, broken on :disabled).
  function setTip(el, text) {
    if (!el) { return; }
    if (text) { el.setAttribute('data-tip', text); }
    else { el.removeAttribute('data-tip'); }
    el.removeAttribute('title');
  }
  // Adds/removes ONE token from a space-separated attribute (aria-describedby can legitimately
  // already carry another id - e.g. deploySdkBtn's own static reference to #deployReadiness -
  // so this only touches its own token, never clobbers whatever else is already there.
  function toggleDescribedBy(el, id, on) {
    var tokens = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    var idx = tokens.indexOf(id);
    if (on && idx === -1) { tokens.push(id); }
    else if (!on && idx !== -1) { tokens.splice(idx, 1); }
    if (tokens.length) { el.setAttribute('aria-describedby', tokens.join(' ')); }
    else { el.removeAttribute('aria-describedby'); }
  }
  var FOCUSABLE_SELECTOR = 'button, input, select, textarea, a[href], [tabindex]';
  // A .tip-host span (used to tip a disabled control - native :hover/:focus never fires on a
  // disabled button, so the wrapper carries data-tip instead) isn't itself what receives focus;
  // aria-describedby has to land on the actual focusable element or a screen reader never
  // announces it. Falls back to the tip-triggering element itself when it's already focusable
  // (e.g. #versionTipHost, which has its own tabindex="0").
  function describedByTarget(el) {
    if (el.matches(FOCUSABLE_SELECTOR)) { return el; }
    return el.querySelector(FOCUSABLE_SELECTOR) || el;
  }

  function initTooltips() {
    var tip = document.createElement('div');
    tip.id = 'uiTip';
    tip.className = 'ui-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    var active = null;
    var showTimer = null;
    var hideTimer = null;

    function hideTip() {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      tip.classList.remove('is-visible');
      hideTimer = setTimeout(function () {
        if (!tip.classList.contains('is-visible')) { tip.hidden = true; }
      }, 120);
      if (active) { toggleDescribedBy(describedByTarget(active), 'uiTip', false); }
      active = null;
    }

    function placeTip(el) {
      var text = el.getAttribute('data-tip');
      if (!text) { hideTip(); return; }
      tip.textContent = text;
      tip.hidden = false;
      tip.classList.remove('is-visible');
      // Measure off-screen first, then position.
      tip.style.left = '0px';
      tip.style.top = '0px';
      var rect = el.getBoundingClientRect();
      var tipW = tip.offsetWidth;
      var tipH = tip.offsetHeight;
      var gap = 8;
      var left = rect.left + (rect.width / 2) - (tipW / 2);
      var top = rect.top - tipH - gap;
      var placeBelow = top < 8;
      if (placeBelow) { top = rect.bottom + gap; }
      left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
      tip.style.left = Math.round(left) + 'px';
      tip.style.top = Math.round(top) + 'px';
      // Force reflow so the fade-in runs.
      void tip.offsetWidth;
      tip.classList.add('is-visible');
      active = el;
      toggleDescribedBy(describedByTarget(el), 'uiTip', true);
    }

    function scheduleShow(el) {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      showTimer = setTimeout(function () { placeTip(el); }, 220);
    }

    function tipTarget(node) {
      var el = node && node.nodeType === 1 ? node : (node && node.parentElement);
      return el && el.closest ? el.closest('[data-tip]') : null;
    }

    document.addEventListener('pointerover', function (e) {
      var el = tipTarget(e.target);
      if (!el || !el.getAttribute('data-tip')) { return; }
      if (el === active) { return; }
      scheduleShow(el);
    });
    document.addEventListener('pointerout', function (e) {
      var el = tipTarget(e.target);
      if (!el) { return; }
      var related = tipTarget(e.relatedTarget);
      if (related === el) { return; }
      if (el === active || showTimer) { hideTip(); }
    });
    document.addEventListener('focusin', function (e) {
      var el = tipTarget(e.target);
      if (!el || !el.getAttribute('data-tip')) { return; }
      // Don't tip text fields on focus - hover is enough and the tip would fight typing.
      if (el.matches('input:not([type="button"]):not([type="submit"]), textarea, select')) { return; }
      scheduleShow(el);
    });
    document.addEventListener('focusout', function (e) {
      var el = tipTarget(e.target);
      var related = tipTarget(e.relatedTarget);
      if (el && related !== el) { hideTip(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideTip(); }
    });
    window.addEventListener('scroll', hideTip, true);
    window.addEventListener('resize', hideTip);
  }

  function populateDropdown() {
    var folders = Object.keys(eligibleApps).sort();
    appSelect.innerHTML = '<option value="">Select an app…</option>' + folders.map(function (f) {
      return '<option value="' + f + '">' + eligibleApps[f].manifest.appName + '</option>';
    }).join('');
    appSelect.disabled = folders.length === 0;
  }

  function runDiscovery() {
    setStatus(discoveryStatus, 'Checking apps…', false);
    return Promise.all(KNOWN_APP_FOLDERS.map(probeApp)).then(function (results) {
      var ineligible = [];
      results.forEach(function (r) {
        if (r.descriptor) { eligibleApps[r.folder] = r.descriptor; }
        else { ineligible.push(r.folder); }
      });
      populateDropdown();
      var eligibleCount = Object.keys(eligibleApps).length;
      if (!eligibleCount) {
        setStatus(discoveryStatus, 'No deployable apps found (each needs a deploy.manifest.js).', true);
      } else if (ineligible.length) {
        setStatus(discoveryStatus, ineligible.length + ' app' + (ineligible.length === 1 ? '' : 's') +
          ' not offered (no deploy.manifest.js, or deployable: false): ' + ineligible.sort().join(', ') + '.', false);
      } else {
        setStatus(discoveryStatus, '', false);
      }

      // Restore the last selected app if it's still deployable. Not a user action, so this must
      // NOT scroll - a page refresh should leave you at the top of the page, not jumped down to
      // the output preview.
      var last = loadLastApp();
      if (last && eligibleApps[last]) {
        appSelect.value = last;
        onAppSelected({ restoring: true });
      }
    });
  }

  // Split a full scope into vendor prefix (x_<code>_) + app slug. Prefer a knownPrefix from the
  // instance when available so a short company code doesn't get confused with the app slug.
  function splitScope(scope, knownPrefix) {
    var s = String(scope || '').trim();
    if (knownPrefix && s.indexOf(knownPrefix) === 0) {
      return { prefix: knownPrefix, name: s.slice(knownPrefix.length) };
    }
    var m = s.match(/^(x_[a-z0-9]+_)/);
    if (m) { return { prefix: m[1], name: s.slice(m[1].length) }; }
    return { prefix: '', name: s };
  }

  function fullScope() {
    return (fldScopePrefix.value + fldScopeName.value).trim();
  }

  // A complete scope has a non-empty app slug past the prefix (e.g. "x_acme_" alone is incomplete).
  function isScopeComplete(scope) {
    var s = String(scope == null ? fullScope() : scope).trim();
    if (!s || /_$/.test(s)) { return false; }
    // Must include at least the x_<code>_<slug> shape, or a non-empty name part in the compound UI.
    return !!(fldScopeName.value.trim() || (s.match(/^x_[a-z0-9]+_[a-z0-9]/) && !/_$/.test(s)));
  }

  function hasLiveConnection() {
    return sessionConnected;
  }

  function syncConnectionSessionUi() {
    // Optimistic Disconnect while Connect is running (or about to, after loading saved creds).
    var showDisconnect = !!(sessionConnected || connectionInFlight);
    if (connectBtn) { connectBtn.hidden = showDisconnect; }
    if (disconnectBtn) { disconnectBtn.hidden = !showDisconnect; }
    refreshBridgeLabel();
    updateSdkBridgeButtons();
  }

  function setBridgeUi(state, label) {
    if (bridgeDot) { bridgeDot.setAttribute('data-state', state || 'checking'); }
    if (bridgeStatusLabel) { bridgeStatusLabel.textContent = label || ''; }
  }

  function syncBridgeCmdDisplay() {
    var cmd = bridgeStartCommand();
    if (bridgeCmdText) {
      bridgeCmdText.value = cmd;
    }
    if (bridgeCmdWrap) { bridgeCmdWrap.hidden = !!sdkBridgeUp; }
    if (bridgeSyncBtn) {
      bridgeSyncBtn.hidden = !(sdkBridgeUp && sessionConnected && !bridgeCredsSynced && !bridgeAuthSyncing);
    }
  }

  function refreshBridgeLabel() {
    syncBridgeCmdDisplay();
    if (!sdkBridgeUp) {
      setBridgeUi('offline', 'SDK bridge: offline — run the terminal command below, then Check again');
      return;
    }
    if (bridgeAuthSyncing) {
      setBridgeUi('syncing', 'SDK bridge: online — syncing credentials…');
      return;
    }
    if (sessionConnected && bridgeCredsSynced) {
      setBridgeUi('online', 'SDK bridge: online — credentials synced, ready to deploy');
      return;
    }
    if (sessionConnected) {
      setBridgeUi('online', 'SDK bridge: online — click Sync credentials or Deploy (syncs automatically)');
      return;
    }
    setBridgeUi('online', 'SDK bridge: online — Connect to your instance next');
  }

  // Quietly push Connect credentials to the local Now SDK alias store. Called after a successful
  // Connect, when the bridge comes back online while a session is already connected, or manually
  // via Sync credentials.
  function maybeSyncAuthToBridge(opts) {
    opts = opts || {};
    if (!sdkBridgeUp || !sessionConnected || bridgeAuthSyncing) { return Promise.resolve(false); }
    if (!(fldInstanceUrl.value.trim() && fldUsername.value.trim() && fldPassword.value)) { return Promise.resolve(false); }
    if (!currentFolder) { return Promise.resolve(false); }
    bridgeAuthSyncing = true;
    refreshBridgeLabel();
    var alias = sdkSyncedAlias || aliasFromInstanceUrl(fldInstanceUrl.value);
    var authFailed = false;
    var lastMessage = '';
    return bridgePostStream('/auth', {
      instanceUrl: fldInstanceUrl.value.trim(),
      username: fldUsername.value.trim(),
      password: fldPassword.value,
      alias: alias,
      appFolder: currentFolder,
    }, function (evt) {
      if (evt.message) { lastMessage = evt.message; }
      if (evt.ok === false) { authFailed = true; }
      if (evt.step === 'done' && evt.alias) { sdkSyncedAlias = evt.alias; }
    }).then(function () {
      bridgeCredsSynced = !authFailed;
      if (authFailed) {
        sdkSyncedAlias = '';
        if (opts.onResult) {
          opts.onResult(false, lastMessage || 'Credential sync failed — check username and password.');
        }
      } else if (opts.onResult) {
        opts.onResult(true, 'Credentials synced to Now SDK.');
      }
      return !authFailed;
    }).catch(function (err) {
      bridgeCredsSynced = false;
      sdkSyncedAlias = '';
      if (opts.onResult) {
        opts.onResult(false, (err && err.message) || 'Could not reach the SDK bridge.');
      }
      return false;
    }).then(function (ok) {
      bridgeAuthSyncing = false;
      refreshBridgeLabel();
      updateSdkBridgeButtons();
      return ok;
    });
  }

  // Deploy is only enabled once every precondition is met: the local sdk-bridge is reachable, the
  // user has a live Connect session, credentials are present, the App ID is complete, and (when the
  // app is not in development and we know the installed version) the App Version is strictly higher
  // than what's on the instance.
  function isDevelopmentApp() {
    return !!(currentParts && currentParts.manifest && currentParts.manifest.development);
  }

  function versionReadyForDeploy() {
    var v = fldVersion.value.trim();
    if (!semver.parseSemver(v)) {
      return { ok: false, tip: 'App Version must be x.y.z' };
    }
    if (isDevelopmentApp() || !installedBaseVersion) {
      return { ok: true, tip: '' };
    }
    var cmp = semver.compareSemver(v, installedBaseVersion);
    if (cmp == null || cmp <= 0) {
      return { ok: false, tip: 'App Version must be higher than installed v' + installedBaseVersion };
    }
    return { ok: true, tip: '' };
  }

  function updateSdkBridgeButtons() {
    var credsReady = !!(fldInstanceUrl.value.trim() && fldUsername.value.trim() && fldPassword.value);
    var versionGate = versionReadyForDeploy();
    var canDeploy = !!(sdkBridgeUp && sessionConnected && credsReady && currentFolder && currentParts &&
      isScopeComplete() && versionGate.ok);
    var reason = !sdkBridgeUp
      ? 'Start the SDK bridge: ' + bridgeStartCommand()
      : (!sessionConnected
        ? 'Connect to the instance first'
        : (!credsReady
          ? 'Enter the instance URL, username, and password'
          : (!isScopeComplete()
            ? 'Finish the App ID before deploying'
            : (!versionGate.ok
              ? versionGate.tip
              : 'Sync Connect credentials to Now SDK, rebuild Fluent, and install on the instance'))));
    if (deploySdkBtn) {
      deploySdkBtn.disabled = !canDeploy;
      setTip(deploySdkBtnTip, reason);
    }
    // Same reason the tooltip shows, but always visible - a disabled button with a hover-only
    // explanation is invisible until you happen to hover it. Blank once every gate clears, since
    // "Ready to deploy" would just repeat the button's own label back at the user.
    if (deployReadiness) {
      deployReadiness.textContent = canDeploy ? '' : reason;
    }
  }

  // Upload/Download used to live here; SDK-only console has just the one button - alias kept so
  // every existing call site (app switch, scope edits, connect/disconnect) stays a one-liner.
  function updateActionButtons() {
    updateSdkBridgeButtons();
  }

  function shellQuote(value) {
    var text = String(value || '');
    if (!/[\s'"\\$`!]/.test(text)) { return text; }
    return '\'' + text.replace(/'/g, '\'\\\'\'') + '\'';
  }

  function formatBridgeRunCommand(opts) {
    opts = opts || {};
    var suiteRoot = opts.suiteRoot || bridgeSuiteRootFromPage();
    var relative = 'tools/sn-deployment-packager/sdk-bridge.js';
    if (suiteRoot) {
      if (/^~[/\w]/.test(suiteRoot) || /^[\w.$/=-]+$/.test(suiteRoot)) {
        return 'cd ' + suiteRoot + ' && node ' + relative;
      }
      return 'cd ' + shellQuote(suiteRoot) + ' && node ' + relative;
    }
    return 'cd "$(git rev-parse --show-toplevel)" && node tools/sn-deployment-packager/sdk-bridge.js';
  }

  function bridgeSuiteRootFromPage() {
    try {
      var bridgeUrl = new URL('sdk-bridge.js', window.location.href);
      if (bridgeUrl.protocol === 'file:') {
        return decodeURIComponent(bridgeUrl.pathname).replace(/\/tools\/sn-deployment-packager\/sdk-bridge\.js$/, '');
      }
      var scriptPath = decodeURIComponent(bridgeUrl.pathname);
      var marker = '/tools/sn-deployment-packager/sdk-bridge.js';
      var markerAt = scriptPath.indexOf(marker);
      if (markerAt > 0) {
        var repoPrefix = scriptPath.slice(0, markerAt);
        if (repoPrefix.indexOf('/Documents/') === 0) {
          return '~' + repoPrefix;
        }
        return repoPrefix;
      }
    } catch (e) {}
    return null;
  }

  function bridgeScriptPathFromPage() {
    var suiteRoot = bridgeSuiteRootFromPage();
    if (!suiteRoot) { return null; }
    if (suiteRoot.indexOf('~') === 0) {
      return '$HOME' + suiteRoot.slice(1) + '/tools/sn-deployment-packager/sdk-bridge.js';
    }
    return suiteRoot + '/tools/sn-deployment-packager/sdk-bridge.js';
  }

  function bridgeScriptPathFromSuiteRoot(suiteRoot) {
    if (!suiteRoot) { return null; }
    return String(suiteRoot).replace(/\/+$/, '') + '/tools/sn-deployment-packager/sdk-bridge.js';
  }

  function cacheBridgeStartCommand(suiteRoot) {
    if (!suiteRoot) { return; }
    try {
      localStorage.setItem(BRIDGE_CMD_CACHE_KEY, formatBridgeRunCommand({ suiteRoot: suiteRoot }));
    } catch (e) {}
  }

  function loadCachedBridgeStartCommand() {
    try { return localStorage.getItem(BRIDGE_CMD_CACHE_KEY) || ''; } catch (e) { return ''; }
  }

  // Absolute path to sdk-bridge.js so the command works from any shell cwd. Prefer a path learned
  // from a prior /health response, then the page URL (file:// or path-style http URLs), then git.
  function bridgeStartCommand() {
    var cached = loadCachedBridgeStartCommand();
    if (cached) { return cached; }
    return formatBridgeRunCommand();
  }

  function scheduleBridgePoll() {
    if (sdkBridgePollTimer) { clearInterval(sdkBridgePollTimer); }
    sdkBridgePollTimer = setInterval(function () { pollSdkBridge(); }, sdkBridgeUp ? 6000 : 2000);
  }

  function pollSdkBridge(opts) {
    opts = opts || {};
    if (opts.manual) { setBridgeUi('checking', 'SDK bridge: checking…'); }
    fetch(SDK_BRIDGE + '/health', { method: 'GET' }).then(function (r) {
      return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status));
    }).then(function (data) {
      var wasUp = sdkBridgeUp;
      sdkBridgeUp = true;
      if (data && data.suiteRoot) {
        cacheBridgeStartCommand(data.suiteRoot);
      } else if (data && data.bridgeScript) {
        cacheBridgeStartCommand(String(data.bridgeScript).replace(/\/tools\/sn-deployment-packager\/sdk-bridge\.js$/, ''));
      }
      refreshBridgeLabel();
      updateSdkBridgeButtons();
      if (!wasUp) { scheduleBridgePoll(); }
      // Auto-sync when the bridge comes back while a Connect session is already live.
      if (!wasUp && sessionConnected) { maybeSyncAuthToBridge(); }
    }).catch(function () {
      var wasUp = sdkBridgeUp;
      sdkBridgeUp = false;
      bridgeCredsSynced = false;
      refreshBridgeLabel();
      updateSdkBridgeButtons();
      if (wasUp || opts.manual) { scheduleBridgePoll(); }
    });
  }

  function startSdkBridgePolling() {
    syncBridgeCmdDisplay();
    pollSdkBridge();
    scheduleBridgePoll();
  }

  function copyBridgeStartCommand() {
    var cmd = bridgeStartCommand();
    function flashCopied() {
      if (!bridgeCopyCmdBtn) { return; }
      var prev = bridgeCopyCmdBtn.textContent;
      bridgeCopyCmdBtn.textContent = 'Copied';
      setTimeout(function () { bridgeCopyCmdBtn.textContent = prev; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd).then(flashCopied).catch(function () {
        window.prompt('Copy this command:', cmd);
      });
    } else {
      window.prompt('Copy this command:', cmd);
    }
  }

  // Fetches the last on-disk Fluent build for this app from the local bridge, so the very first
  // version suggestion for a freshly-selected app compares against what was actually last deployed
  // rather than treating this session's first build as having "no prior" to diff against.
  function fetchPriorFluentSources(folder) {
    return fetch(SDK_BRIDGE + '/fluent-sources?appFolder=' + encodeURIComponent(folder))
      .then(function (r) { return r.ok ? r.json() : { files: {} }; })
      .then(function (data) { return (data && data.files) || {}; })
      .catch(function () { return {}; });
  }

  // POSTs to the local sdk-bridge and streams back NDJSON progress events, calling onEvent(evt) for
  // each parsed line as it arrives. Resolves once the stream ends. If the bridge answers with a
  // plain JSON body (an error caught before the stream started, e.g. bad request), that's parsed
  // and thrown instead.
  // No progress chunk for this long means something's actually stuck (a wedged now-sdk child
  // process, a dropped connection the browser hasn't noticed yet) - not just a slow install step,
  // which keeps streaming heartbeats well inside this window. Long enough that a real multi-minute
  // "Building the Fluent project…" phase (bridge sends periodic keep-alive events) never trips it.
  var BRIDGE_STREAM_INACTIVITY_MS = 45000;

  function bridgePostStream(pathName, body, onEvent) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var idleTimer = null;
    function resetIdleTimer() {
      if (idleTimer) { clearTimeout(idleTimer); }
      if (!controller) { return; }
      idleTimer = setTimeout(function () {
        controller.abort();
      }, BRIDGE_STREAM_INACTIVITY_MS);
    }
    resetIdleTimer();

    return fetch(SDK_BRIDGE + pathName, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    }).then(function (r) {
      var contentType = r.headers.get('Content-Type') || '';
      if (contentType.indexOf('application/json') === 0) {
        return r.json().then(function (data) {
          throw new Error((data && data.error) || ('HTTP ' + r.status));
        });
      }
      function consumeLines(text) {
        text.split('\n').forEach(function (line) {
          line = line.trim();
          if (!line) { return; }
          try { onEvent(JSON.parse(line)); } catch (e) {}
        });
      }
      if (!r.body || !r.body.getReader) {
        // Fallback for environments without a streaming Response.body (older browsers).
        return r.text().then(consumeLines);
      }
      var reader = r.body.getReader();
      var decoder = new TextDecoder('utf-8');
      var buffer = '';
      function pump() {
        return reader.read().then(function (result) {
          resetIdleTimer();
          if (result.value) {
            buffer += decoder.decode(result.value, { stream: !result.done });
            var lines = buffer.split('\n');
            buffer = lines.pop();
            consumeLines(lines.join('\n'));
          }
          if (result.done) {
            if (buffer.trim()) { consumeLines(buffer); }
            return;
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (err) {
      if (err && err.name === 'AbortError') {
        throw new Error('No response from the SDK bridge for ' + (BRIDGE_STREAM_INACTIVITY_MS / 1000) +
          's - it may have crashed or wedged. Check that terminal window, then try again.');
      }
      throw err;
    }).then(function (result) {
      if (idleTimer) { clearTimeout(idleTimer); }
      return result;
    }, function (err) {
      if (idleTimer) { clearTimeout(idleTimer); }
      throw err;
    });
  }

  function aliasFromInstanceUrl(url) {
    try {
      var host = new URL(String(url || '').trim()).hostname || '';
      var first = host.split('.')[0];
      return (first && /^[a-zA-Z0-9_-]+$/.test(first)) ? first : 'sn-instance';
    } catch (e) {
      return 'sn-instance';
    }
  }

  /* ------------------------------- Deploy progress modal ------------------------------- */

  var deployModalFinished = false;

  function onDeployModalKeydown(e) {
    // Escape only dismisses once finished - matches Done/Close being hidden until then, so there's
    // no way to lose track of whether a still-running deploy got dismissed or not.
    if (e.key === 'Escape' && deployModalFinished) {
      e.preventDefault();
      closeDeployModal();
      return;
    }
    trapTabWithin(deployModalOverlay.querySelector('.modal'), e);
  }

  function openDeployModal() {
    deployModalFinished = false;
    setDeployStatus('Starting…');
    deployProgressLog.innerHTML = '';
    setDeployProgress(0);
    deployModalDoneBtn.hidden = true;
    deployModalOverlay.hidden = false;
    document.addEventListener('keydown', onDeployModalKeydown, true);
    // Nothing inside is focusable until Done appears (see trapTabWithin) - park focus on the modal
    // itself so Tab has a sane starting point instead of staying wherever it was on the page behind.
    var modalEl = deployModalOverlay.querySelector('.modal');
    if (modalEl) { modalEl.setAttribute('tabindex', '-1'); modalEl.focus(); }
  }

  function appendDeployLog(msg, isError) {
    if (!msg) { return; }
    var line = document.createElement('div');
    if (isError) { line.className = 'err'; }
    line.textContent = msg;
    deployProgressLog.appendChild(line);
    deployProgressLog.scrollTop = deployProgressLog.scrollHeight;
  }

  function setDeployProgress(pct) {
    deployProgressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  function setDeployStatus(text) {
    deployModalStatus.textContent = text || '';
  }

  // Only Done ends the modal. While a deploy is in flight the button stays hidden so the modal
  // cannot be dismissed mid-stream.
  function finishDeployModal(success) {
    deployModalFinished = true;
    deployModalDoneBtn.hidden = false;
    deployModalDoneBtn.textContent = success ? 'Done' : 'Close';
  }

  function closeDeployModal() {
    if (!deployModalFinished) { return; }
    deployModalOverlay.hidden = true;
    document.removeEventListener('keydown', onDeployModalKeydown, true);
  }

  // Maps a 0-100 bridge-reported pct onto a sub-range of the modal's overall bar, so auth and
  // deploy (two separate NDJSON streams) still read as one continuous progress bar.
  function scalePct(pct, lo, hi) {
    if (typeof pct !== 'number') { return null; }
    return lo + (Math.max(0, Math.min(100, pct)) / 100) * (hi - lo);
  }

  function onDeploySdkClick() {
    if (!sessionConnected || !sdkBridgeUp || !currentFolder || !currentParts) { return; }
    var alias = sdkSyncedAlias || aliasFromInstanceUrl(fldInstanceUrl.value);
    if (deploySdkBtn) { deploySdkBtn.disabled = true; }
    openDeployModal();
    setDeployStatus('Syncing Connect credentials to Now SDK…');

    var authFailed = false;
    bridgePostStream('/auth', {
      instanceUrl: fldInstanceUrl.value.trim(),
      username: fldUsername.value.trim(),
      password: fldPassword.value,
      alias: alias,
      appFolder: currentFolder,
    }, function (evt) {
      appendDeployLog(evt.message, evt.ok === false);
      var scaled = scalePct(evt.pct, 0, 45);
      if (scaled != null) { setDeployProgress(scaled); }
      if (evt.ok === false) { authFailed = true; }
      if (evt.step === 'done' && evt.alias) { sdkSyncedAlias = evt.alias; }
    }).then(function () {
      if (authFailed) {
        setDeployStatus('Deploy failed during credential sync.');
        finishDeployModal(false);
        updateSdkBridgeButtons();
        return;
      }
      setDeployStatus('Building the Fluent project and installing on the instance…');
      var deployFailed = false;
      return bridgePostStream('/deploy', {
        appFolder: currentFolder,
        alias: sdkSyncedAlias || alias,
        scope: fullScope(),
        appName: fldAppName.value.trim(),
        version: fldVersion.value.trim(),
      }, function (evt) {
        appendDeployLog(evt.message, evt.ok === false);
        var scaled = scalePct(evt.pct, 45, 100);
        if (scaled != null) { setDeployProgress(scaled); }
        if (evt.ok === false) { deployFailed = true; }
      }).then(function () {
        if (deployFailed) {
          setDeployStatus('Deploy failed.');
          finishDeployModal(false);
        } else {
          setDeployProgress(100);
          setDeployStatus('Deploy finished.');
          finishDeployModal(true);
          runDetectAndLookup();
        }
        updateSdkBridgeButtons();
      });
    }).catch(function (err) {
      appendDeployLog('Deploy failed: ' + ((err && err.message) || err), true);
      setDeployStatus('Deploy failed.');
      finishDeployModal(false);
      updateSdkBridgeButtons();
    });
  }

  // Ends the live instance session. Credentials stay in the form (and in saved connections) so the
  // user can Connect again; App ID locks from the session are cleared so the fields are editable.
  function disconnectSession(opts) {
    opts = opts || {};
    sessionConnected = false;
    connectionInFlight = false;
    sdkSyncedAlias = '';
    bridgeCredsSynced = false;
    ourInstalledSysId = null;
    installedBaseVersion = null;
    scopeUniqueness = 'unknown';
    if (scopeCheckTimer) { clearTimeout(scopeCheckTimer); scopeCheckTimer = null; }
    if (opts.clearScope !== false) {
      setScopeParts('', '', { prefixLocked: false, fullyLocked: false });
      scopeUserTouched = false;
      if (currentParts && currentParts.manifest) {
        fldAppName.value = currentParts.manifest.appName;
        fldVersion.value = currentParts.manifest.version || '1.0.0';
        versionDirty = false;
      }
    } else {
      scopePrefixLocked = false;
      scopeFullyLocked = false;
      applyScopeLockState();
    }
    detectStatus.textContent = opts.message != null ? opts.message : 'Disconnected.';
    syncConnectionSessionUi();
    updateScopeFieldUI();
    updateActionButtons();
    if (currentParts) { rebuildFluent(); }
  }

  function appShowsConnection() {
    var d = currentFolder && eligibleApps[currentFolder];
    return !!(d && d.deployOptions && d.deployOptions.showConnection);
  }

  // True when App ID is locked because the manifest pins a fixed scope (no live connection UI),
  // as opposed to locking after finding an existing install on a connected instance.
  function scopeLockedFromManifest() {
    return scopeFullyLocked && !appShowsConnection();
  }

  function applyScopeLockState() {
    fldScopePrefix.readOnly = scopePrefixLocked;
    fldScopeName.readOnly = scopeFullyLocked;
    var room = Math.max(1, core.SCOPE_MAX - fldScopePrefix.value.length);
    fldScopeName.maxLength = room;
    var fromManifest = scopeLockedFromManifest();
    setTip(fldScopePrefix, scopePrefixLocked
      ? (fromManifest ? 'Fixed App ID from this app\'s deploy.manifest.js' : 'Vendor prefix from the connected instance')
      : 'Vendor prefix (x_company_)');
    setTip(fldScopeName, scopeFullyLocked
      ? (fromManifest ? 'Fixed App ID from this app\'s deploy.manifest.js' : 'Locked to the app already installed on this instance')
      : 'App name portion of the App ID');
    // Size the prefix to its content so the name-field caret sits right after it.
    fldScopePrefix.style.width = '0';
    fldScopePrefix.style.width = Math.max(fldScopePrefix.scrollWidth, 1) + 'px';
  }

  function setScopeParts(prefix, name, opts) {
    opts = opts || {};
    scopePrefixLocked = !!opts.prefixLocked;
    scopeFullyLocked = !!opts.fullyLocked;
    fldScopePrefix.value = prefix || '';
    fldScopeName.value = name || '';
    applyScopeLockState();
  }

  function setScopeFromFull(scope, opts) {
    opts = opts || {};
    var parts = splitScope(scope, opts.knownPrefix);
    setScopeParts(parts.prefix, parts.name, opts);
  }

  // Updates the Scope compound's error styling + status line. Incomplete App ID is only an error
  // after Connect has settled or the user has edited the field - blank-on-load is expected for
  // connection apps (Connect fills the prefix), so we don't flash red on first paint.
  function updateScopeFieldUI() {
    var scope = fullScope();
    var incomplete = !isScopeComplete(scope);
    var taken = scopeUniqueness === 'taken';
    var pendingFill = incomplete && !scopeUserTouched && !sessionConnected;
    var erroneous = taken || (incomplete && !pendingFill && !connectionInFlight);
    scopeCompound.classList.toggle('field-error', erroneous);

    if (incomplete && (connectionInFlight || pendingFill)) {
      scopeStatus.textContent = connectionInFlight
        ? 'Connecting — App ID will fill from the instance…'
        : '';
      scopeStatus.className = 'field-status';
    } else if (incomplete) {
      scopeStatus.textContent = 'App ID is incomplete';
      scopeStatus.className = 'field-status field-status-error';
    } else if (scopeUniqueness === 'checking') {
      scopeStatus.textContent = 'Checking whether this App ID is free on the target instance…';
      scopeStatus.className = 'field-status';
    } else if (taken) {
      scopeStatus.textContent = 'App ID already in use on the target instance - pick a different one.';
      scopeStatus.className = 'field-status field-status-error';
    } else if (scopeUniqueness === 'own') {
      scopeStatus.textContent = 'App ID matches this app\'s existing install - safe to update.';
      scopeStatus.className = 'field-status';
    } else if (scopeUniqueness === 'free') {
      scopeStatus.textContent = 'App ID is available on the target instance.';
      scopeStatus.className = 'field-status';
    } else if (scopeLockedFromManifest()) {
      scopeStatus.textContent = 'Fixed App ID from this app\'s deploy.manifest.js.';
      scopeStatus.className = 'field-status';
    } else {
      scopeStatus.textContent = hasLiveConnection() ? '' : 'Connect to the target instance to verify this App ID is unique.';
      scopeStatus.className = 'field-status';
    }
    updateActionButtons();
  }

  // Debounced live check: is this scope free (or already ours) on the target instance?
  function scheduleScopeUniquenessCheck() {
    if (scopeCheckTimer) { clearTimeout(scopeCheckTimer); scopeCheckTimer = null; }
    scopeUniqueness = 'unknown';
    updateScopeFieldUI();
    if (!isScopeComplete() || !hasLiveConnection() || !currentParts) { return; }
    scopeCheckTimer = setTimeout(runScopeUniquenessCheck, 400);
  }

  function runScopeUniquenessCheck() {
    if (!isScopeComplete() || !hasLiveConnection() || !currentParts) { return; }
    var scope = fullScope();
    var folder = currentFolder;
    var ourSysId = core.deriveSysIds(currentParts.manifest).app;
    // Prefer the live installed sys_id when we already looked it up (same value, but explicit).
    if (ourInstalledSysId) { ourSysId = ourInstalledSysId; }
    scopeUniqueness = 'checking';
    updateScopeFieldUI();
    var conn = { instanceUrl: fldInstanceUrl.value, username: fldUsername.value, password: fldPassword.value };
    window.SNDeploymentPackager.instance.getScopeOccupant(conn, scope).then(function (occupant) {
      if (folder !== currentFolder || fullScope() !== scope) { return; } // stale
      if (!occupant) {
        scopeUniqueness = 'free';
      } else if (occupant.sys_id === ourSysId) {
        scopeUniqueness = 'own';
      } else {
        scopeUniqueness = 'taken';
      }
      updateScopeFieldUI();
    }).catch(function () {
      if (folder !== currentFolder || fullScope() !== scope) { return; }
      scopeUniqueness = 'unknown';
      updateScopeFieldUI();
    });
  }

  // The manifest as edited in the override fields (App name / Scope / Version).
  function manifestFromFields() {
    var manifest = {};
    for (var k in currentParts.manifest) { if (Object.prototype.hasOwnProperty.call(currentParts.manifest, k)) { manifest[k] = currentParts.manifest[k]; } }
    manifest.appName = fldAppName.value.trim() || manifest.appName;
    manifest.scope = fullScope() || manifest.scope;
    manifest.version = fldVersion.value.trim() || manifest.version;
    return manifest;
  }

  // Sorted so folders group naturally (package.json / now.config.json first, then src/fluent/**).
  function sortedFluentPaths() {
    return Object.keys(fluentFiles).sort(function (a, b) {
      var ar = a.indexOf('/') === -1 ? 0 : 1, br = b.indexOf('/') === -1 ? 0 : 1;
      return ar !== br ? ar - br : (a < b ? -1 : a > b ? 1 : 0);
    });
  }

  function shallowCopy(obj) {
    var out = {};
    for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) { out[k] = obj[k]; } }
    return out;
  }

  // Suggests the next App Version from the Fluent-file diff since the last rebuild (or the last
  // on-disk build, for the very first rebuild of a freshly-selected app - see
  // fetchPriorFluentSources). For release apps (manifest.development !== true), keeps the
  // suggestion strictly above the installed instance version when Connect found one. Development
  // apps keep the current/installed version — no forced bump. If the user has hand-edited the
  // Version field this session (versionDirty), their value is left alone (tooltip still explains).
  function applyVersionSuggestion() {
    if (!currentParts) { return; }
    var tip;
    if (isDevelopmentApp()) {
      var keep = installedBaseVersion || currentParts.manifest.version || '1.0.0';
      if (!versionDirty) { fldVersion.value = keep; }
      tip = 'Development mode — same version may be redeployed; bumps are optional until ' +
        'manifest.development is turned off.' +
        (installedBaseVersion ? ' Installed on instance: v' + installedBaseVersion + '.' : '') +
        (versionDirty ? ' (kept your edited version.)' : '');
      setTip(versionTipHost, tip);
      priorFluentFiles = shallowCopy(fluentFiles);
      return;
    }
    var base = installedBaseVersion || currentParts.manifest.version || '1.0.0';
    var suggestion = semver.suggestRelease({
      baseVersion: base,
      minVersion: installedBaseVersion || null,
      prevFiles: priorFluentFiles,
      nextFiles: fluentFiles,
      installed: !!installedBaseVersion,
    });
    tip = suggestion.reason;
    if (versionDirty) {
      tip += ' (kept your edited version.)';
      if (installedBaseVersion) {
        var cmp = semver.compareSemver(fldVersion.value.trim(), installedBaseVersion);
        if (cmp == null || cmp <= 0) {
          tip += ' Must be higher than installed v' + installedBaseVersion + '.';
        }
      }
    } else {
      fldVersion.value = suggestion.version;
    }
    setTip(versionTipHost, tip);
    priorFluentFiles = shallowCopy(fluentFiles);
  }

  function rebuildFluent() {
    if (!currentParts) { return; }
    var manifest = manifestFromFields();
    // priorFluentFiles is the disk snapshot (on app load) or the last emit (after rebuild). Prefer
    // it over fluentFiles so a stale previous-app map cannot leak composite ids across apps.
    var priorKeysText =
      (priorFluentFiles && priorFluentFiles['src/fluent/generated/keys.ts']) ||
      (fluentFiles && fluentFiles['src/fluent/generated/keys.ts']) ||
      null;
    fluentFiles = fluent.assembleFluent(manifest, currentParts.parts, {
      mode: 'project',
      sdkVersion: manifest.deployOptions && manifest.deployOptions.fluent && manifest.deployOptions.fluent.sdkVersion,
      priorKeysText: priorKeysText,
    });
    var paths = sortedFluentPaths();
    if (paths.indexOf(fluentActivePath) === -1) {
      // README first: it explains what the generated project IS and how to deploy it, which is what
      // you want on landing. The previous default (the first widgets/*.now.ts) was a poor fit for a
      // multi-widget app - it silently picked one of five arbitrarily, by filename order.
      fluentActivePath = (paths.indexOf('README.md') !== -1 ? 'README.md' : '') ||
        paths.filter(function (p) { return /widgets\/.*\.now\.ts$/.test(p); })[0] ||
        paths[0] || '';
    }
    fluentFileSelect.innerHTML = paths.map(function (p) {
      return '<option value="' + p + '"' + (p === fluentActivePath ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
    setOutputContent(
      fluentActivePath ? fluentFiles[fluentActivePath] : '',
      languageForPath(fluentActivePath)
    );
    applyVersionSuggestion();
    updateActionButtons();
  }

  // opts.restoring: true when called by runDiscovery to re-select the last app on page load,
  // rather than by the user actually picking one. Suppresses the scroll-into-view below - a
  // refresh should leave you where a fresh page load belongs (the top), not scrolled down to the
  // output preview as though you'd just chosen something.
  function onAppSelected(opts) {
    var restoring = !!(opts && opts.restoring);
    var folder = appSelect.value;
    saveLastApp(folder);
    outputSection.style.display = 'none';
    overridesSection.style.display = 'none';
    connectionSection.style.display = 'none';
    if (bridgeSection) { bridgeSection.style.display = 'none'; }
    currentParts = null;
    fluentFiles = null;
    ourInstalledSysId = null;
    sessionConnected = false;
    connectionInFlight = false;
    scopeUserTouched = false;
    bridgeCredsSynced = false;
    sdkSyncedAlias = '';
    scopeUniqueness = 'unknown';
    scopePrefixLocked = false;
    scopeFullyLocked = false;
    installedBaseVersion = null;
    versionDirty = false;
    priorFluentFiles = {};
    setTip(versionTipHost, 'Version suggestion appears after Connect / rebuild');
    syncConnectionSessionUi();
    updateActionButtons();
    if (!folder) { setStatus(buildStatus, '', false); return; }

    currentFolder = folder;
    var descriptor = eligibleApps[folder];
    setStatus(buildStatus, 'Fetching sources for ' + descriptor.manifest.appName + '…', false);

    detectStatus.textContent = '';
    var showConnection = !!(descriptor.deployOptions && descriptor.deployOptions.showConnection);
    connectionSection.style.display = showConnection ? '' : 'none';
    var savedConn = null;
    if (showConnection) {
      refreshSavedInstanceSelect(loadLastInstanceId());
      var selectedId = savedInstanceSelect.value;
      var savedInst = selectedId && loadSavedInstances().filter(function (i) { return i.id === selectedId; })[0];
      if (savedInst) {
        applyInstanceFields(savedInst);
      } else {
        savedConn = loadSavedConn(folder);
        fldInstanceUrl.value = (savedConn && savedConn.instanceUrl) || '';
        fldUsername.value = (savedConn && savedConn.username) || '';
        fldPassword.value = (savedConn && savedConn.password) || '';
      }
      applyConnectionFieldLock();
      // Saved full credentials → auto-Connect is coming; show Disconnect immediately so Connect
      // doesn't flash first while sources load.
      if (fldInstanceUrl.value.trim() && fldUsername.value.trim() && fldPassword.value) {
        connectionInFlight = true;
        detectStatus.textContent = 'Connecting…';
        syncConnectionSessionUi();
      }
    }

    loadSources(folder, descriptor).then(function (sources) {
      var parts = core.buildParts(descriptor.manifest, sources, {});
      currentParts = { manifest: descriptor.manifest, parts: parts };

      fldAppName.value = descriptor.manifest.appName;
      if (showConnection) {
        // Leave App ID blank until Connect fills/locks the instance prefix (or the user types one).
        setScopeParts('', '', { prefixLocked: false, fullyLocked: false });
      } else {
        // Fixed-scope apps (no connection panel) ship a complete manifest.scope - prefill and lock
        // so Deploy is reachable as soon as a bridge/session are available (e.g. Standards' x_gfsp_standards).
        setScopeFromFull(descriptor.manifest.scope || '', {
          prefixLocked: true,
          fullyLocked: true,
        });
      }
      fldVersion.value = descriptor.manifest.version || '1.0.0';
      versionDirty = false;

      fluentActivePath = ''; // let the Fluent view re-default (see rebuildFluent) for the new app
      overridesSection.style.display = '';
      if (bridgeSection) { bridgeSection.style.display = ''; }
      outputSection.style.display = '';
      refreshBridgeLabel();
      pollSdkBridge();
      // Everything from here down was hidden a moment ago - on a normal viewport the panels the
      // user needs next have nothing visible next to them until they scroll. Scroll to the top of
      // what just appeared (App ID/Version, then Bridge, then the output preview below it) rather
      // than jumping straight to the bottom, so a connection-panel app's Connect step - already
      // visible above this - isn't skipped past. behavior: 'auto' (instant), not 'smooth' -
      // smooth-scroll animation runs on requestAnimationFrame, which a throttled or backgrounded
      // tab can silently never fire, so the "smooth" version can just never complete.
      // Skipped when restoring on page load (see onAppSelected's opts).
      if (!restoring) {
        overridesSection.scrollIntoView({ behavior: 'auto', block: 'start' });
      }

      return fetchPriorFluentSources(folder).then(function (files) {
        if (folder !== currentFolder) { return; } // the user switched apps while this was in flight
        priorFluentFiles = files || {};
        rebuildFluent();
        // No "Built successfully" message - the App ID/Version fields and the output preview
        // becoming visible (and now scrolled into view) already ARE the success signal; a text
        // message saying so too is redundant. Just clear the "Fetching sources…" line it replaces.
        setStatus(buildStatus, '', false);
        updateScopeFieldUI();
        scheduleScopeUniquenessCheck();
        updateActionButtons();

        // A saved connection with all three fields already filled means we can check the target
        // instance for an existing install right away, instead of waiting for a manual Connect
        // click - see runDetectAndLookup's own comment for what this sets.
        if (showConnection && fldInstanceUrl.value && fldUsername.value && fldPassword.value) {
          runDetectAndLookup();
        }
      });
    }).catch(function (err) {
      connectionInFlight = false;
      syncConnectionSessionUi();
      setStatus(buildStatus, 'Build failed: ' + err.message, true);
    });
  }

  // Detects the target instance's company prefix, then looks up whether THIS app already exists
  // there (by its own deterministic sys_id - see instance.js's getInstalledApp) so Scope/App
  // name/Version get set from the REAL installed record rather than guessed:
  //   - found:      full scope is locked to the installed value (prefix + name both read-only), and
  //                 installedBaseVersion is set so applyVersionSuggestion() bumps from the real
  //                 installed version instead of the manifest default
  //   - not found:  prefix is locked to "x_<companycode>_", name left for the user to type
  // Runs both from the Connect button AND automatically once per app selection when a
  // saved connection already has all three fields (see onAppSelected).
  function runDetectAndLookup() {
    if (!fldInstanceUrl.value.trim() || !fldUsername.value.trim() || !fldPassword.value) {
      connectionInFlight = false;
      syncConnectionSessionUi();
      detectStatus.textContent = 'Enter the target instance URL, username, and password first.';
      return;
    }
    connectionInFlight = true;
    syncConnectionSessionUi();
    updateScopeFieldUI();
    detectStatus.textContent = 'Connecting…';
    var conn = { instanceUrl: fldInstanceUrl.value, username: fldUsername.value, password: fldPassword.value };
    var folder = currentFolder;
    saveConn(folder);
    var instanceApi = window.SNDeploymentPackager.instance;
    instanceApi.detectCompanyPrefix(conn).then(function (code) {
      if (folder !== currentFolder) { return; } // the user switched apps while this was in flight
      if (!code) {
        connectionInFlight = false;
        sessionConnected = true;
        syncConnectionSessionUi();
        detectStatus.textContent = "Connected, but couldn't read a vendor prefix - set App ID by hand below.";
        updateScopeFieldUI();
        updateActionButtons();
        maybeSyncAuthToBridge();
        return;
      }
      var descriptor = eligibleApps[folder];
      var ids = core.deriveSysIds(descriptor.manifest);
      var derivedPrefix = core.deriveScopePrefix(code);
      return instanceApi.getInstalledApp(conn, ids.app).then(function (installed) {
        if (folder !== currentFolder) { return; }
        connectionInFlight = false;
        sessionConnected = true;
        syncConnectionSessionUi();
        if (installed) {
          ourInstalledSysId = installed.sys_id;
          fldAppName.value = installed.name;
          setScopeFromFull(installed.scope, {
            knownPrefix: derivedPrefix,
            prefixLocked: true,
            fullyLocked: true,
          });
          installedBaseVersion = installed.version;
          versionDirty = false;
        } else {
          ourInstalledSysId = null;
          installedBaseVersion = null;
          setScopeParts(derivedPrefix, '', { prefixLocked: true, fullyLocked: false });
        }
        updateScopeFieldUI();
        scheduleScopeUniquenessCheck();
        updateActionButtons();
        // Let suggestRelease (via rebuildFluent -> applyVersionSuggestion) work out the next
        // version from the real installed version + Fluent diff, rather than a bare patch bump.
        rebuildFluent();
        detectStatus.textContent = installed
          ? 'Found existing install (v' + installed.version + ') - suggested next version ' + fldVersion.value + '.'
          : 'Prefix detected: ' + derivedPrefix;
        maybeSyncAuthToBridge();
      });
    }).catch(function (e) {
      connectionInFlight = false;
      sessionConnected = false;
      bridgeCredsSynced = false;
      syncConnectionSessionUi();
      detectStatus.textContent = formatConnectError(e);
      updateActionButtons();
      refreshBridgeLabel();
      updateScopeFieldUI();
    });
  }

  // Turns raw fetch/HTTP failures into actionable operator copy. CORS and "Failed to fetch" are
  // the usual mystery when Connect is run from a local suite server against a remote instance.
  function formatConnectError(e) {
    var msg = String((e && e.message) || e || 'unknown error');
    var status = e && e.httpStatus;
    if (status === 401 || status === 403) {
      return 'Connection failed: check username/password and roles (HTTP ' + status + ').';
    }
    if (status) {
      return 'Connection failed: HTTP ' + status + '. Check the instance URL and that the Table API is reachable.';
    }
    if (/failed to fetch|networkerror|load failed|network request failed|access-control|cors/i.test(msg)) {
      return 'Connection failed: the browser could not reach the instance (often CORS, a bad URL, or being offline). ' +
        'Allow CORS from this origin on the instance, or check the instance URL.';
    }
    return 'Connection failed: ' + msg;
  }

  // Wrapped, not passed directly - otherwise the DOM Event lands in onAppSelected's opts slot.
  appSelect.addEventListener('change', function () { onAppSelected(); });
  fldAppName.addEventListener('input', rebuildFluent);
  function onScopePartInput(el) {
    scopeUserTouched = true;
    // Keep the slug legal for ServiceNow scope chars while typing.
    if (el === fldScopeName || (!scopePrefixLocked && el === fldScopePrefix)) {
      var start = el.selectionStart;
      var cleaned = el.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleaned !== el.value) {
        el.value = cleaned;
        try { el.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1)); } catch (e) {}
      }
    }
    if (!scopePrefixLocked && el === fldScopePrefix) {
      applyScopeLockState(); // refresh name maxlength as prefix length changes
    }
    rebuildFluent();
    scheduleScopeUniquenessCheck();
  }
  fldScopePrefix.addEventListener('input', function () { onScopePartInput(fldScopePrefix); });
  fldScopeName.addEventListener('input', function () { onScopePartInput(fldScopeName); });
  fldVersion.addEventListener('input', function () {
    versionDirty = true;
    rebuildFluent();
  });
  connectBtn.addEventListener('click', runDetectAndLookup);
  disconnectBtn.addEventListener('click', function () { disconnectSession(); });
  if (deploySdkBtn) { deploySdkBtn.addEventListener('click', onDeploySdkClick); }
  if (deployModalDoneBtn) { deployModalDoneBtn.addEventListener('click', closeDeployModal); }
  savedInstanceSelect.addEventListener('change', onSavedInstanceSelected);
  saveInstanceBtn.addEventListener('click', onSaveInstanceClick);
  removeInstanceBtn.addEventListener('click', onRemoveInstanceClick);
  modalCloseBtn.addEventListener('click', function () { closeModal(null); });
  modalCancelBtn.addEventListener('click', function () { closeModal(null); });
  modalConfirmBtn.addEventListener('click', acceptModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) { closeModal(null); }
  });
  [fldInstanceUrl, fldUsername, fldPassword].forEach(function (el) {
    el.addEventListener('input', function () {
      saveConn(currentFolder);
      if (sessionConnected || connectionInFlight) {
        // Keep typed App ID values, but the live session no longer matches these credentials.
        disconnectSession({
          clearScope: false,
          message: 'Credentials changed - Connect again to refresh.',
        });
      } else {
        scheduleScopeUniquenessCheck();
      }
      sdkSyncedAlias = '';
      bridgeCredsSynced = false;
      updateSdkBridgeButtons();
      refreshBridgeLabel();
    });
  });
  fluentFileSelect.addEventListener('change', function () {
    fluentActivePath = fluentFileSelect.value;
    setOutputContent(fluentFiles[fluentActivePath] || '', languageForPath(fluentActivePath));
  });

  if (bridgeCheckBtn) {
    bridgeCheckBtn.addEventListener('click', function () { pollSdkBridge({ manual: true }); });
  }
  if (bridgeCopyCmdBtn) {
    bridgeCopyCmdBtn.addEventListener('click', copyBridgeStartCommand);
  }
  if (bridgeSyncBtn) {
    bridgeSyncBtn.addEventListener('click', function () {
      maybeSyncAuthToBridge({
        onResult: function (ok, message) {
          if (bridgeStatusLabel) {
            setBridgeUi(ok ? 'online' : 'syncing', message);
          }
          refreshBridgeLabel();
        },
      });
    });
  }

  // Password visibility toggle - masked by default; eyeball reveals plain text when needed.
  togglePasswordBtn.addEventListener('click', function () {
    var show = fldPassword.type === 'password';
    fldPassword.type = show ? 'text' : 'password';
    passwordWrap.classList.toggle('is-visible', show);
    togglePasswordBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
    togglePasswordBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    setTip(togglePasswordBtn, show ? 'Hide password' : 'Show password');
  });

  function syncThemeTip() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTip(themeToggleBtn, dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  syncThemeTip();

  // Light/dark toggle - same primary accents as Widget Studio (#054b80 / #5b9fe0), persisted locally.
  themeToggleBtn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('snDeployConsole_theme', next); } catch (e) {}
    syncThemeTip();
    syncEditorTheme();
  });

  initTooltips();
  loadMonaco();
  startSdkBridgePolling();
  runDiscovery();
})();
