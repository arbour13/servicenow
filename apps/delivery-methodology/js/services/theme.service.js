/* Light/dark theme service. Handles the app-wide light/dark toggle (html[data-theme]), persisted to
   localStorage and applied straight to documentElement.

   init('deliveryMethodology') namespaces this app's stored preference
   ('deliveryMethodologyTheme') independently of any other app - this is why the service is
   init-first rather than reading localStorage at construction.

   Own copy, not shared - this is the slim, app-theme-only subset (no editor-theme half; this app has
   no output pane). The full version (with the editor-theme cycle) lives in Glide Studio, the only
   app that needs it. */
angular.module('deliveryMethodology').factory('ThemeService', [function () {
  'use strict';

  var THEME_KEY; // set by init()
  var appTheme;

  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function load(key) {
    try {
      return localStorage.getItem(key);
    } catch (loadError) {
      return null;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (saveError) {
      /* storage unavailable */
    }
  }
  var widgetObserver = null;

  // Packager scopes CSS under .dm-widget[data-theme=…], so every SP wrapper needs the attribute
  // (not only <html>). Harness has no .dm-widget — querySelectorAll is then a no-op.
  function stampWidgets() {
    if (!appTheme) {
      return;
    }
    var widgets = document.querySelectorAll('.dm-widget');
    var index;
    for (index = 0; index < widgets.length; index++) {
      widgets[index].setAttribute('data-theme', appTheme);
    }
  }

  function ensureWidgetObserver() {
    if (widgetObserver || typeof MutationObserver === 'undefined' || !document.documentElement) {
      return;
    }
    widgetObserver = new MutationObserver(function () {
      stampWidgets();
    });
    widgetObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function applyApp() {
    document.documentElement.setAttribute('data-theme', appTheme);
    stampWidgets();
  }

  var svc = {
    // Call once before use, with this app's own localStorage key prefix. A manual choice (stored)
    // always wins; with no stored choice yet, default to the OS/browser's prefers-color-scheme so
    // the app matches the system out of the box.
    init: function (keyPrefix) {
      THEME_KEY = keyPrefix + 'Theme';
      appTheme = load(THEME_KEY);
      if (!appTheme) {
        if (systemPrefersDark()) {
          appTheme = 'dark';
        } else {
          appTheme = 'light';
        }
      }
      applyApp();
      ensureWidgetObserver();
      // Late-mounted SP wrappers after first paint.
      if (typeof setTimeout === 'function') {
        setTimeout(stampWidgets, 0);
      }
      return svc;
    },
    // A snapshot the controller mirrors onto vm after each mutation.
    readState: function () {
      return {
        theme: appTheme
      };
    },
    toggleApp: function () {
      if (appTheme === 'dark') {
        appTheme = 'light';
      } else {
        appTheme = 'dark';
      }
      save(THEME_KEY, appTheme);
      applyApp();
    },
    stampWidgets: stampWidgets
  };
  return svc;
}]);
