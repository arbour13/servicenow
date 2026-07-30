/* Light/dark theme service. Handles the app-wide light/dark toggle (html[data-theme]), persisted to
   localStorage and applied straight to documentElement.

   init('deliveryMethodology') namespaces this app's stored preference
   ('deliveryMethodologyTheme') independently of any other app - this is why the service is
   init-first rather than reading localStorage at construction.

   Own copy, not shared - this is the slim, app-theme-only subset (no editor-theme half; this app has
   no output pane). The full version (with the editor-theme cycle) lives in Glide Studio, the only
   app that needs it.

   Packager scopes `body { background: var(--paper) }` to `.dm-widget`, so only the widget wrappers
   get the brand wash. On Service Portal the five stacked widgets sit in opaque white SP chrome
   (panel/column/instance wrappers), which shows as white bands between Shell and the active view
   and under the last widget. paintPageChrome() drops a fixed full-viewport wash behind the widgets
   and forces those SP wrappers transparent while .dm-widget is on the page. */
angular.module('deliveryMethodology').factory('ThemeService', [function () {
  'use strict';

  var THEME_KEY; // set by init()
  var appTheme;
  var PAGE_STYLE_ID = 'dm-theme-page-chrome';
  var PAGE_WASH_ID = 'dm-page-wash';
  // Keep in sync with scss/_tokens.scss $hs-navy-0 and :root[data-theme="light"] --paper.
  var PAPER = {
    dark: '#0a2136',
    light: '#cfeef5'
  };

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
  var paintScheduleTimer = null;

  function paperColor() {
    if (appTheme === 'light') {
      return PAPER.light;
    }
    return PAPER.dark;
  }

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

  function ensurePageWash(color) {
    if (!document.body) {
      return;
    }
    var wash = document.getElementById(PAGE_WASH_ID);
    if (!wash) {
      wash = document.createElement('div');
      wash.id = PAGE_WASH_ID;
      wash.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(wash, document.body.firstChild);
    }
    wash.style.position = 'fixed';
    wash.style.top = '0';
    wash.style.right = '0';
    wash.style.bottom = '0';
    wash.style.left = '0';
    wash.style.zIndex = '0';
    wash.style.pointerEvents = 'none';
    wash.style.backgroundColor = color;
  }

  // Fixed viewport wash + transparent SP chrome so leftover white never shows between/under the
  // five stacked .dm-widget roots (class-name guessing alone is too fragile across portals).
  function paintPageChrome() {
    if (!appTheme) {
      return;
    }
    var color = paperColor();
    var root = document.documentElement;
    root.style.backgroundColor = color;
    root.classList.add('dm-theme-active');
    root.setAttribute('data-dm-theme', appTheme);
    if (document.body) {
      document.body.style.backgroundColor = color;
    }
    ensurePageWash(color);
    // Direct paint — portal theme CSS often wins on main.body / section.page without !important
    // from a late-injected sheet, and some builds use body.body instead of main.body.
    var portalChrome = document.querySelectorAll('main.body, main, section.page, body.body');
    var chromeIndex;
    for (chromeIndex = 0; chromeIndex < portalChrome.length; chromeIndex++) {
      portalChrome[chromeIndex].style.backgroundColor = color;
      portalChrome[chromeIndex].style.backgroundImage = 'none';
    }
    if (!document.head) {
      return;
    }
    var styleEl = document.getElementById(PAGE_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = PAGE_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = [
      'html.dm-theme-active, html.dm-theme-active body, html.dm-theme-active body.body {',
      '  background-color: ' + color + ' !important;',
      '}',
      /* Paint only — leave section.page / main.body padding alone (portal header clearance). */
      'html.dm-theme-active:has(.dm-widget) main.body,',
      'html.dm-theme-active:has(.dm-widget) main,',
      'html.dm-theme-active:has(.dm-widget) section.page,',
      'html.dm-theme-active:has(.dm-widget) section.page .body {',
      '  background-color: ' + color + ' !important;',
      '  background-image: none !important;',
      '}',
      '#' + PAGE_WASH_ID + ' {',
      '  position: fixed !important;',
      '  inset: 0 !important;',
      '  z-index: 0 !important;',
      '  pointer-events: none !important;',
      '  background-color: ' + color + ' !important;',
      '}',
      'html.dm-theme-active .dm-widget {',
      '  position: relative !important;',
      '  z-index: 1 !important;',
      '  background-color: ' + color + ' !important;',
      '}',
      /* Inactive view widgets are an empty .dm-widget (ng-if removed .app) — hide them so SP
         instance chrome does not reserve a white strip between Shell and the active view. */
      'html.dm-theme-active .dm-widget:not(:has(.app)) {',
      '  display: none !important;',
      '}',
      /* Only while our widgets are mounted: neutralize opaque portal wrappers behind them. */
      'html.dm-theme-active:has(.dm-widget) .sp-page,',
      'html.dm-theme-active:has(.dm-widget) .sp-page-root,',
      'html.dm-theme-active:has(.dm-widget) .sp-page-content,',
      'html.dm-theme-active:has(.dm-widget) .sp-container,',
      'html.dm-theme-active:has(.dm-widget) .container.sp-container,',
      'html.dm-theme-active:has(.dm-widget) .sp-row,',
      'html.dm-theme-active:has(.dm-widget) .row.sp-row,',
      'html.dm-theme-active:has(.dm-widget) .sp-column,',
      'html.dm-theme-active:has(.dm-widget) .sp-widget,',
      'html.dm-theme-active:has(.dm-widget) .widget,',
      'html.dm-theme-active:has(.dm-widget) .panel,',
      'html.dm-theme-active:has(.dm-widget) .panel-default,',
      'html.dm-theme-active:has(.dm-widget) .panel-body,',
      'html.dm-theme-active:has(.dm-widget) .panel-heading {',
      '  background: transparent !important;',
      '  background-color: transparent !important;',
      '  background-image: none !important;',
      '  box-shadow: none !important;',
      '  border-color: transparent !important;',
      '}'
    ].join('\n');
  }

  function scheduleChromeRefresh() {
    if (paintScheduleTimer) {
      return;
    }
    paintScheduleTimer = setTimeout(function () {
      paintScheduleTimer = null;
      stampWidgets();
      paintPageChrome();
    }, 50);
  }

  function ensureWidgetObserver() {
    if (widgetObserver || typeof MutationObserver === 'undefined' || !document.documentElement) {
      return;
    }
    widgetObserver = new MutationObserver(function (mutations) {
      var index;
      for (index = 0; index < mutations.length; index++) {
        var target = mutations[index].target;
        if (target && target.id === PAGE_STYLE_ID) {
          continue;
        }
        if (target && target.id === PAGE_WASH_ID) {
          continue;
        }
        scheduleChromeRefresh();
        return;
      }
    });
    widgetObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function applyApp() {
    document.documentElement.setAttribute('data-theme', appTheme);
    stampWidgets();
    paintPageChrome();
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
        setTimeout(function () {
          stampWidgets();
          paintPageChrome();
        }, 0);
        setTimeout(function () {
          stampWidgets();
          paintPageChrome();
        }, 250);
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
    stampWidgets: stampWidgets,
    paintPageChrome: paintPageChrome
  };
  return svc;
}]);
