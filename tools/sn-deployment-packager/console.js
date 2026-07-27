/* Standalone deploy console: build/download/upload a ServiceNow Update Set for ANY app in this
   suite that has a deploy.manifest.js (see manifest.schema.md), without opening that app's own
   dev harness. Every app under apps/ is probed for a deploy.manifest.js; apps without one are
   simply not offered - see manifest.schema.md's "deploy.manifest.js" section. Framework-agnostic
   plain JS (no Angular) - this is a build-time tool, never deployed, same convention as
   core.js. Review and edit app source in VS Code + the app's local harness; this console only
   packages. */
(function () {
  'use strict';

  var core = window.SNDeploymentPackager.core;
  var fluent = window.SNDeploymentPackager.fluent;
  var zipper = window.SNDeploymentPackager.zip;

  // Every app folder this suite currently has (mirrors ServiceNow/CLAUDE.md's apps/ listing) -
  // adding a new app means adding its folder name here so the console probes it. An app with no
  // deploy.manifest.js just comes back ineligible; nothing else has to change.
  var KNOWN_APP_FOLDERS = [
    'glide-studio', 'standards',
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
  var detectStatus = document.getElementById('detectStatus');
  var savedInstanceSelect = document.getElementById('savedInstanceSelect');
  var saveInstanceBtn = document.getElementById('saveInstanceBtn');
  var removeInstanceBtn = document.getElementById('removeInstanceBtn');
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
  var outputSection = document.getElementById('outputSection');
  var outputEditorHost = document.getElementById('outputEditor');
  var outputFallback = document.getElementById('outputFallback');
  var sysIdSummary = document.getElementById('sysIdSummary');
  var downloadBtn = document.getElementById('downloadBtn');
  var downloadBtnLabel = document.getElementById('downloadBtnLabel');
  var uploadBtn = document.getElementById('uploadBtn');
  var uploadBtnTip = document.getElementById('uploadBtnTip');
  var downloadBtnTip = document.getElementById('downloadBtnTip');
  var removeInstanceTip = document.getElementById('removeInstanceTip');
  var uploadStatus = document.getElementById('uploadStatus');
  var scopeStatus = document.getElementById('scopeStatus');
  var formatXmlBtn = document.getElementById('formatXmlBtn');
  var formatFluentBtn = document.getElementById('formatFluentBtn');
  var outputHint = document.getElementById('outputHint');
  var fluentControls = document.getElementById('fluentControls');
  var fluentFileSelect = document.getElementById('fluentFileSelect');

  var eligibleApps = {};    // folder -> descriptor
  var currentFolder = null;
  var currentParts = null;  // buildParts() result, cached per app selection
  var currentXml = '';

  var format = 'xml';          // 'xml' | 'fluent' - restored from localStorage on init
  var fluentFiles = {};        // { path: contents } for the current Fluent build
  var fluentActivePath = '';   // which generated file the editor is showing
  var outputEditor = null;     // Monaco instance once loaded
  var pendingOutput = { text: '', language: 'xml' };

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

  function getOutputText() {
    if (outputEditor) { return outputEditor.getValue(); }
    return outputFallback.value || '';
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
    pendingOutput = { text: text || '', language: language || 'xml' };
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
  // When true, fldScopePrefix is read-only (set from the instance company code / existing install).
  var scopePrefixLocked = false;
  // When true, the whole scope is fixed (existing install) - name is read-only too.
  var scopeFullyLocked = false;
  // Only meaningful for apps with deployOptions.showConnection - the most recently detected company
  // code, kept around purely for display/reference (runDetectAndLookup always re-detects fresh
  // rather than trusting a stale value across app switches or repeat clicks).
  function connStorageKey(folder) { return 'snDeployConsole_conn_' + folder; }
  var LAST_APP_KEY = 'snDeployConsole_lastApp';
  var LAST_FORMAT_KEY = 'snDeployConsole_lastFormat';
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
  function loadLastFormat() {
    try {
      var v = localStorage.getItem(LAST_FORMAT_KEY);
      return (v === 'fluent' || v === 'xml') ? v : 'xml';
    } catch (e) { return 'xml'; }
  }
  function saveLastFormat(next) {
    try { localStorage.setItem(LAST_FORMAT_KEY, next === 'fluent' ? 'fluent' : 'xml'); } catch (e) {}
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
    var locked = !!savedInstanceSelect.value;
    fldInstanceUrl.readOnly = locked;
    fldUsername.readOnly = locked;
    fldPassword.readOnly = locked;
    saveInstanceBtn.hidden = locked;
    if (connectionHint) {
      connectionHint.textContent = locked
        ? 'URL, username, and password are locked for this saved connection. Choose New connection to enter different details.'
        : 'To add a saved connection, leave New connection selected, fill in the fields, then click Save for later.';
    }
    if (!locked) {
      saveInstanceBtn.textContent = 'Save for later';
      setTip(saveInstanceBtn, 'Save these credentials as a new named connection');
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
    }
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
      detectStatus.textContent = 'Enter instance details, then Connect or Save for later.';
      return;
    }
    var inst = loadSavedInstances().filter(function (i) { return i.id === id; })[0];
    if (!inst) { return; }
    applyInstanceFields(inst);
    saveLastInstanceId(id);
    if (currentFolder) { saveConn(currentFolder); }
    applyConnectionFieldLock();
    detectStatus.textContent = 'Loaded “' + inst.name + '” - click Connect when ready.';
  }
  function onSaveInstanceClick() {
    if (savedInstanceSelect.value) { return; } // fields are locked for saved connections
    if (!fldInstanceUrl.value.trim() || !fldUsername.value.trim() || !fldPassword.value) {
      detectStatus.textContent = 'Enter instance URL, username, and password before saving.';
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
  function initTooltips() {
    var tip = document.createElement('div');
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
      return '<option value="' + f + '">' + eligibleApps[f].manifest.appName + ' (' + f + ')</option>';
    }).join('');
    appSelect.disabled = folders.length === 0;
  }

  function runDiscovery() {
    setStatus(discoveryStatus, 'Checking apps…', false);
    return Promise.all(KNOWN_APP_FOLDERS.map(probeApp)).then(function (results) {
      results.forEach(function (r) {
        if (r.descriptor) { eligibleApps[r.folder] = r.descriptor; }
      });
      populateDropdown();
      var eligibleCount = Object.keys(eligibleApps).length;
      if (!eligibleCount) {
        setStatus(discoveryStatus, 'No deployable apps found (each needs a deploy.manifest.js).', true);
      } else {
        setStatus(discoveryStatus, '', false);
      }

      // Restore the last selected app if it's still deployable.
      var last = loadLastApp();
      if (last && eligibleApps[last]) {
        appSelect.value = last;
        onAppSelected();
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
    return !!(fldInstanceUrl.value.trim() && fldUsername.value.trim() && fldPassword.value);
  }

  function applyScopeLockState() {
    fldScopePrefix.readOnly = scopePrefixLocked;
    fldScopeName.readOnly = scopeFullyLocked;
    var room = Math.max(1, core.SCOPE_MAX - fldScopePrefix.value.length);
    fldScopeName.maxLength = room;
    setTip(fldScopePrefix, scopePrefixLocked
      ? 'Vendor prefix from the connected instance'
      : 'Vendor prefix (x_company_)');
    setTip(fldScopeName, scopeFullyLocked
      ? 'Locked to the app already installed on this instance'
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

  // Updates the Scope compound's error styling + status line. Incomplete scopes are always erroneous.
  // When a live connection is available and the scope is complete, also reflects uniqueness.
  function updateScopeFieldUI() {
    var scope = fullScope();
    var incomplete = !isScopeComplete(scope);
    var taken = scopeUniqueness === 'taken';
    var erroneous = incomplete || taken;
    scopeCompound.classList.toggle('field-error', erroneous);

    if (incomplete) {
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

  // The manifest as edited in the override fields (App name / Scope / Version), used by both output
  // targets so they stay in sync with what's typed.
  function manifestFromFields() {
    var manifest = {};
    for (var k in currentParts.manifest) { if (Object.prototype.hasOwnProperty.call(currentParts.manifest, k)) { manifest[k] = currentParts.manifest[k]; } }
    manifest.appName = fldAppName.value.trim() || manifest.appName;
    manifest.scope = fullScope() || manifest.scope;
    manifest.version = fldVersion.value.trim() || manifest.version;
    return manifest;
  }

  // Dispatches to whichever output target is active. Called on every field edit and format switch.
  function rebuildOutput() {
    if (!currentParts) { return; }
    if (format === 'fluent') { rebuildFluent(); } else { rebuildXml(); }
  }

  function rebuildXml() {
    if (!currentParts) { return; }
    var manifest = manifestFromFields();
    currentXml = core.assembleXml(manifest, currentParts.parts, { stamp: nowStamp() });
    setOutputContent(currentXml, 'xml');

    var ids = core.deriveSysIds(manifest);
    var allSysIds = Object.keys(ids).map(function (k) { return ids[k]; })
      .concat((manifest.providers || []).map(function (p) { return core.stableSysId(manifest.sysIdPrefix, p.name); }))
      .concat((manifest.stubProviders || []).map(function (n) { return core.stableSysId(manifest.sysIdPrefix, n); }));
    var dupes = allSysIds.filter(function (id, i) { return allSysIds.indexOf(id) !== i; });
    sysIdSummary.textContent = dupes.length
      ? 'WARNING: ' + dupes.length + ' duplicate sys_id(s) - import may overwrite the wrong records'
      : '';
  }

  // Sorted so folders group naturally (package.json / now.config.json first, then src/fluent/**).
  function sortedFluentPaths() {
    return Object.keys(fluentFiles).sort(function (a, b) {
      var ar = a.indexOf('/') === -1 ? 0 : 1, br = b.indexOf('/') === -1 ? 0 : 1;
      return ar !== br ? ar - br : (a < b ? -1 : a > b ? 1 : 0);
    });
  }

  function rebuildFluent() {
    if (!currentParts) { return; }
    var manifest = manifestFromFields();
    fluentFiles = fluent.assembleFluent(manifest, currentParts.parts, {
      mode: 'project',
      sdkVersion: manifest.deployOptions && manifest.deployOptions.fluent && manifest.deployOptions.fluent.sdkVersion,
    });
    var paths = sortedFluentPaths();
    if (paths.indexOf(fluentActivePath) === -1) {
      // Default to the widget's .now.ts - the most useful file to land on.
      fluentActivePath = paths.filter(function (p) { return /widgets\/.*\.now\.ts$/.test(p); })[0] || paths[0] || '';
    }
    fluentFileSelect.innerHTML = paths.map(function (p) {
      return '<option value="' + p + '"' + (p === fluentActivePath ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
    setOutputContent(
      fluentActivePath ? fluentFiles[fluentActivePath] : '',
      languageForPath(fluentActivePath)
    );
    sysIdSummary.textContent = '';
  }

  function syncOutputHint() {
    if (!outputHint) { return; }
    if (format === 'fluent') {
      outputHint.innerHTML =
        '<strong>How to use this Fluent export</strong>' +
        '<ol>' +
        '<li>Download the <code>.zip</code>, then unzip it.</li>' +
        '<li>In that folder run <code>npm install</code>.</li>' +
        '<li>Authenticate the Now SDK to your instance ' +
        '(see <a href="https://servicenow.github.io/sdk/" target="_blank" rel="noopener">ServiceNow SDK docs</a>).</li>' +
        '<li>Run <code>npm run build</code>, then <code>npm run deploy</code> to push metadata to the instance.</li>' +
        '</ol>';
      return;
    }
    outputHint.innerHTML =
      '<strong>How to use this Update Set</strong>' +
      '<ol>' +
      '<li><strong>Upload</strong> (when connected) writes the package to Retrieved Update Sets on the target instance, ' +
      'or <strong>Download</strong> the XML and import it yourself under ' +
      '<strong>System Update Sets → Retrieved Update Sets → Import Update Set from XML</strong>.</li>' +
      '<li>Open the Retrieved Update Set, preview the changes, then commit. ' +
      'Upload does not commit for you.</li>' +
      '</ol>';
  }

  // Switch output target (XML <-> Fluent), toggling which control row is visible.
  function setFormat(next) {
    format = next === 'fluent' ? 'fluent' : 'xml';
    saveLastFormat(format);
    formatXmlBtn.classList.toggle('active', format === 'xml');
    formatFluentBtn.classList.toggle('active', format === 'fluent');
    fluentControls.style.display = format === 'fluent' ? '' : 'none';
    if (downloadBtnLabel) {
      downloadBtnLabel.textContent = format === 'fluent' ? 'Download Fluent .zip' : 'Download Update Set';
    }
    syncOutputHint();
    if (format === 'xml') { rebuildXml(); } else { rebuildFluent(); }
    updateActionButtons();
  }

  function onAppSelected() {
    var folder = appSelect.value;
    saveLastApp(folder);
    outputSection.style.display = 'none';
    overridesSection.style.display = 'none';
    connectionSection.style.display = 'none';
    currentParts = null;
    ourInstalledSysId = null;
    scopeUniqueness = 'unknown';
    scopePrefixLocked = false;
    scopeFullyLocked = false;
    uploadStatus.textContent = '';
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
    }

    loadSources(folder, descriptor).then(function (sources) {
      var parts = core.buildParts(descriptor.manifest, sources, {});
      currentParts = { manifest: descriptor.manifest, parts: parts };

      fldAppName.value = descriptor.manifest.appName;
      // Leave Scope blank until detect fills/locks the instance prefix (or the user types one).
      setScopeParts('', '', { prefixLocked: false, fullyLocked: false });
      fldVersion.value = descriptor.manifest.version || '1.0.0';

      fluentActivePath = ''; // let the Fluent view re-default to the widget file for the new app
      overridesSection.style.display = '';
      outputSection.style.display = '';
      if (format === 'xml') { rebuildXml(); } else { rebuildFluent(); }
      setStatus(buildStatus, 'Built ' + descriptor.manifest.appName + ' successfully.', false);
      updateScopeFieldUI();
      scheduleScopeUniquenessCheck();
      updateActionButtons();

      // A saved connection with all three fields already filled means we can check the target
      // instance for an existing install right away, instead of waiting for a manual Connect
      // click - see runDetectAndLookup's own comment for what this sets.
      if (showConnection && fldInstanceUrl.value && fldUsername.value && fldPassword.value) {
        runDetectAndLookup();
      }
    }).catch(function (err) {
      setStatus(buildStatus, 'Build failed: ' + err.message, true);
    });
  }

  // Detects the target instance's company prefix, then looks up whether THIS app already exists
  // there (by its own deterministic sys_id - see instance.js's getInstalledApp) so Scope/App
  // name/Version get set from the REAL installed record rather than guessed:
  //   - found:      full scope is locked to the installed value (prefix + name both read-only)
  //   - not found:  prefix is locked to "x_<companycode>_", name left for the user to type
  // Runs both from the Connect button AND automatically once per app selection when a
  // saved connection already has all three fields (see onAppSelected).
  function runDetectAndLookup() {
    if (!fldInstanceUrl.value.trim() || !fldUsername.value.trim() || !fldPassword.value) {
      detectStatus.textContent = 'Enter the target instance URL, username, and password first.';
      return;
    }
    detectStatus.textContent = 'Connecting…';
    var conn = { instanceUrl: fldInstanceUrl.value, username: fldUsername.value, password: fldPassword.value };
    var folder = currentFolder;
    saveConn(folder);
    var instanceApi = window.SNDeploymentPackager.instance;
    instanceApi.detectCompanyPrefix(conn).then(function (code) {
      if (folder !== currentFolder) { return; } // the user switched apps while this was in flight
      if (!code) { detectStatus.textContent = "Connected, but couldn't read a vendor prefix - set App ID by hand below."; return; }
      var descriptor = eligibleApps[folder];
      var ids = core.deriveSysIds(descriptor.manifest);
      var derivedPrefix = core.deriveScopePrefix(code);
      return instanceApi.getInstalledApp(conn, ids.app).then(function (installed) {
        if (folder !== currentFolder) { return; }
        if (installed) {
          ourInstalledSysId = installed.sys_id;
          fldAppName.value = installed.name;
          setScopeFromFull(installed.scope, {
            knownPrefix: derivedPrefix,
            prefixLocked: true,
            fullyLocked: true,
          });
          fldVersion.value = core.bumpPatchVersion(installed.version);
          detectStatus.textContent = 'Found existing install (v' + installed.version + ') - next version ' + fldVersion.value + '.';
        } else {
          ourInstalledSysId = null;
          setScopeParts(derivedPrefix, '', { prefixLocked: true, fullyLocked: false });
          detectStatus.textContent = 'Prefix detected: ' + derivedPrefix + '.';
        }
        updateScopeFieldUI();
        scheduleScopeUniquenessCheck();
        updateActionButtons();
        rebuildOutput();
      });
    }).catch(function (e) {
      detectStatus.textContent = 'Connection failed: ' + ((e && e.message) || e);
    });
  }

  // Upload / Download enablement - both wait for a complete App ID.
  function updateActionButtons() {
    var descriptor = currentFolder && eligibleApps[currentFolder];
    var uploadEligible = !!(currentParts && format === 'xml' && descriptor && descriptor.deployOptions && descriptor.deployOptions.showConnection);
    uploadBtnTip.hidden = !uploadEligible;
    uploadBtn.style.display = uploadEligible ? '' : 'none';
    var scopeComplete = isScopeComplete();
    var uploadScopeOk = scopeComplete && (scopeUniqueness === 'free' || scopeUniqueness === 'own');
    uploadBtn.disabled = !uploadEligible || !uploadScopeOk;
    if (uploadEligible) {
      if (!scopeComplete) {
        setTip(uploadBtnTip, 'Finish the App ID before uploading');
      } else if (scopeUniqueness === 'taken') {
        setTip(uploadBtnTip, 'This App ID is already used by another app on the instance');
      } else if (scopeUniqueness === 'unknown' || scopeUniqueness === 'checking') {
        setTip(uploadBtnTip, 'Connect to verify this App ID is unique before uploading');
      } else {
        setTip(uploadBtnTip, 'Upload to Retrieved Update Sets on the connected instance');
      }
    } else {
      setTip(uploadBtnTip, '');
    }
    downloadBtn.disabled = !currentParts || !scopeComplete;
    downloadBtn.classList.toggle('secondary', format !== 'fluent');
    if (format === 'fluent') {
      setTip(downloadBtnTip, !currentParts
        ? ''
        : (scopeComplete ? 'Download the Fluent project as a .zip' : 'Finish the App ID before downloading'));
      if (downloadBtnLabel) { downloadBtnLabel.textContent = 'Download Fluent .zip'; }
    } else {
      setTip(downloadBtnTip, !currentParts
        ? ''
        : (scopeComplete ? 'Download the Update Set as XML' : 'Finish the App ID before downloading'));
      if (downloadBtnLabel) { downloadBtnLabel.textContent = 'Download Update Set'; }
    }
  }

  // Uploads the CURRENT XML output straight onto the target instance's Retrieved Update Sets via
  // the Table API (core.js's wrapAsUpdateSet + recordToApiFields, instance.js's publishUpdateSet) -
  // an in-place replacement for "download the .xml, then upload it by hand" in that one screen.
  // Deliberately does NOT commit - see instance.js's header comment for why; the status message
  // below always says so explicitly, so this never reads as "fully deployed." On success, opens
  // the Retrieved Update Set form in a new tab so the user can preview and commit there.
  function onUploadClick() {
    if (!currentParts) { return; }
    if (!fldInstanceUrl.value.trim() || !fldUsername.value.trim() || !fldPassword.value) {
      uploadStatus.textContent = 'Enter the target instance URL, username, and password first.';
      return;
    }
    if (!isScopeComplete()) {
      uploadStatus.textContent = 'App ID looks incomplete (' + (fullScope() || 'empty') + ') - finish it before uploading.';
      updateScopeFieldUI();
      return;
    }
    var manifest = manifestFromFields();
    var conn = { instanceUrl: fldInstanceUrl.value, username: fldUsername.value, password: fldPassword.value };
    var folder = currentFolder;
    var ourSysId = ourInstalledSysId || core.deriveSysIds(manifest).app;
    var base = fldInstanceUrl.value.trim().replace(/\/$/, '');
    saveConn(folder);
    uploadBtn.disabled = true;
    uploadStatus.textContent = 'Verifying App ID is unique on the target instance…';

    window.SNDeploymentPackager.instance.getScopeOccupant(conn, manifest.scope).then(function (occupant) {
      if (folder !== currentFolder) { return null; }
      if (occupant && occupant.sys_id !== ourSysId) {
        scopeUniqueness = 'taken';
        updateScopeFieldUI();
        uploadBtn.disabled = false;
        uploadStatus.textContent = 'App ID "' + manifest.scope + '" is already used by another app on the target instance.';
        return null;
      }
      scopeUniqueness = occupant ? 'own' : 'free';
      updateScopeFieldUI();

      var model = core.buildRecordModel(manifest, currentParts.parts);
      var wrapped = core.wrapAsUpdateSet(manifest, model);
      var setSysId = wrapped[0].sysId; // header is always first - see wrapAsUpdateSet
      var records = wrapped.map(function (rec) {
        return { table: rec.table, sysId: rec.sysId, apiFields: core.recordToApiFields(rec) };
      });
      uploadStatus.textContent = 'Uploading ' + records.length + ' records…';
      return window.SNDeploymentPackager.instance.publishUpdateSet(conn, records).then(function (written) {
        return { written: written, setSysId: setSysId };
      });
    }).then(function (result) {
      uploadBtn.disabled = false;
      if (!result || folder !== currentFolder) { return; }
      uploadStatus.textContent = 'Uploaded ' + result.written.length + ' records to Retrieved Update Sets - ' +
        'opened in a new tab; preview and commit there (not done automatically).';
      window.open(base + '/sys_remote_update_set.do?sys_id=' + result.setSysId, '_blank');
      runDetectAndLookup();
    }).catch(function (e) {
      uploadBtn.disabled = false;
      if (folder !== currentFolder) { return; }
      var count = (e && e.written && e.written.length) || 0;
      uploadStatus.textContent = 'Upload failed' + (count ? ' after ' + count + ' records' : '') + ': ' + ((e && e.message) || e);
    });
  }

  appSelect.addEventListener('change', onAppSelected);
  fldAppName.addEventListener('input', rebuildOutput);
  function onScopePartInput(el) {
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
    rebuildOutput();
    scheduleScopeUniquenessCheck();
  }
  fldScopePrefix.addEventListener('input', function () { onScopePartInput(fldScopePrefix); });
  fldScopeName.addEventListener('input', function () { onScopePartInput(fldScopeName); });
  fldVersion.addEventListener('input', rebuildOutput);
  connectBtn.addEventListener('click', runDetectAndLookup);
  savedInstanceSelect.addEventListener('change', onSavedInstanceSelected);
  saveInstanceBtn.addEventListener('click', onSaveInstanceClick);
  removeInstanceBtn.addEventListener('click', onRemoveInstanceClick);
  modalCloseBtn.addEventListener('click', function () { closeModal(null); });
  modalCancelBtn.addEventListener('click', function () { closeModal(null); });
  modalConfirmBtn.addEventListener('click', acceptModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) { closeModal(null); }
  });
  uploadBtn.addEventListener('click', onUploadClick);
  [fldInstanceUrl, fldUsername, fldPassword].forEach(function (el) {
    el.addEventListener('input', function () {
      saveConn(currentFolder);
      scheduleScopeUniquenessCheck();
    });
  });
  formatXmlBtn.addEventListener('click', function () { setFormat('xml'); });
  formatFluentBtn.addEventListener('click', function () { setFormat('fluent'); });
  fluentFileSelect.addEventListener('change', function () {
    fluentActivePath = fluentFileSelect.value;
    setOutputContent(fluentFiles[fluentActivePath] || '', languageForPath(fluentActivePath));
  });

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadBtn.addEventListener('click', function () {
    if (!currentFolder || !isScopeComplete()) { return; }
    if (format === 'fluent') {
      triggerDownload(zipper.zip(fluentFiles), currentFolder + '-fluent.zip');
      return;
    }
    triggerDownload(new Blob([currentXml || getOutputText()], { type: 'text/plain' }), currentFolder + '-update-set.xml');
  });

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
  setFormat(loadLastFormat());
  loadMonaco();
  runDiscovery();
})();
