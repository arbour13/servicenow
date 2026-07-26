[function () {
  'use strict';

  // The editor theme cycles auto -> light -> dark -> auto on a single button (not a 3-way direct
  // pick) - matches the sidenav's own theme toggle interaction.
  var EDITOR_THEME_ORDER = ['auto', 'light', 'dark'];
  var EDITOR_THEME_LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark' };

  var THEME_KEY, EDITOR_THEME_KEY; // set by init()
  var appTheme, editorTheme;

  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function applyApp() { document.documentElement.setAttribute('data-theme', appTheme); }
  // "auto" isn't a real CSS value; resolve it to whichever concrete theme (light/dark) matches the
  // app theme right now, so the output panes track the app toggle. The resolved value (never "auto")
  // is what the template binds to the DOM.
  function resolveEditor() { return editorTheme === 'auto' ? appTheme : editorTheme; }

  var svc = {
    // Call once before use, with this app's own localStorage key prefix. A manual choice (stored)
    // always wins; with no stored choice yet, default to the OS/browser's prefers-color-scheme so
    // the app matches the system out of the box.
    init: function (keyPrefix) {
      THEME_KEY = keyPrefix + 'Theme';
      EDITOR_THEME_KEY = keyPrefix + 'EditorTheme';
      appTheme = load(THEME_KEY) || (systemPrefersDark() ? 'dark' : 'light');
      editorTheme = load(EDITOR_THEME_KEY) || 'auto';
      applyApp();
      return svc;
    },
    // A snapshot the controller mirrors onto vm after each mutation. Toggling the app theme also
    // moves editorApplied when the editor is on "auto", so callers re-read the whole state.
    readState: function () {
      return { theme: appTheme, editorTheme: editorTheme, editorApplied: resolveEditor() };
    },
    editorLabel: function () { return EDITOR_THEME_LABELS[editorTheme]; },
    toggleApp: function () {
      appTheme = appTheme === 'dark' ? 'light' : 'dark';
      save(THEME_KEY, appTheme);
      applyApp();
    },
    cycleEditor: function () {
      editorTheme = EDITOR_THEME_ORDER[(EDITOR_THEME_ORDER.indexOf(editorTheme) + 1) % EDITOR_THEME_ORDER.length];
      save(EDITOR_THEME_KEY, editorTheme);
    },
  };
  return svc;
}]