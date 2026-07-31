[function () {
  'use strict';

  var THEME_KEY; // set by init()
  var appTheme;

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

  var svc = {
    // Call once before use, with this app's own localStorage key prefix. A manual choice (stored)
    // always wins; with no stored choice yet, default to the OS/browser's prefers-color-scheme so
    // the app matches the system out of the box.
    init: function (keyPrefix) {
      THEME_KEY = keyPrefix + 'Theme';
      appTheme = load(THEME_KEY) || (systemPrefersDark() ? 'dark' : 'light');
      applyApp();
      return svc;
    },
    // A snapshot the controller mirrors onto vm after each mutation.
    readState: function () { return { theme: appTheme }; },
    toggleApp: function () {
      appTheme = appTheme === 'dark' ? 'light' : 'dark';
      save(THEME_KEY, appTheme);
      applyApp();
    },
  };
  return svc;
}]