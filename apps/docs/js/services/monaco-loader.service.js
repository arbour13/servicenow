/* Loads Monaco Editor from a pinned CDN version, eagerly and non-blocking, behind ONE cached
   promise that MarkdownEditorService falls back from on any failure - offline, a CSP block, a
   timeout, or a foreign AMD loader already on the page. loadMonaco() is called once, fire-and-
   forget, right when MarkdownEditorService itself is constructed (effectively app boot, since
   this app has exactly one controller instantiated on load) - by the time a reader has actually
   read a page and clicked Edit, Monaco has almost always already arrived.

   Monaco itself never appears in deploy.manifest.js and is never packaged - the SN Deployment
   Packager has no mechanism to ship a third-party library (see manifest.schema.md), and even a
   plain <script> tag here would never reach a deployed Service Portal widget regardless (the
   packager ships only the <div class="app"> subtree, and this file's own script tag lives outside
   it in index.html). Monaco is a LOCAL HARNESS enhancement; the deployed widget always runs the
   textarea overlay - see MarkdownEditorService's own fallback driver. */
angular.module('glidefastDocs').factory('MonacoLoaderService', ['$timeout', function ($timeout) {
  'use strict';

  // Pinned, not @latest - a CDN release landing on a Tuesday should never be able to break this
  // app. Bump deliberately, and re-check the Monarch tokenizer and keybinding APIs when you do.
  var MONACO_VERSION = '0.52.2';
  var MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@' + MONACO_VERSION + '/min';
  var LOAD_TIMEOUT_MS = 8000;

  function getIfReady() {
    return (window.monaco && window.monaco.editor) ? window.monaco : null;
  }

  // Monaco's own background worker (used for basic language services even with suggestions/hover
  // turned off) has to be served from the SAME origin it was loaded from - a plain `new
  // Worker(url)` pointed at a cross-origin script is blocked by the browser. This same-origin
  // wrapper (a same-origin blob that immediately importScripts() the real cross-origin file) is
  // the documented workaround for a CDN-hosted Monaco.
  function installWorkerShim() {
    window.MonacoEnvironment = {
      getWorkerUrl: function () {
        var workerSource = 'self.MonacoEnvironment = { baseUrl: "' + MONACO_BASE + '/" };\n' +
          'importScripts("' + MONACO_BASE + '/vs/base/worker/workerMain.js");';
        return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(workerSource);
      },
    };
  }

  var loadPromise = null;

  function loadMonaco() {
    if (loadPromise) { return loadPromise; }

    var ready = getIfReady();
    if (ready) {
      loadPromise = Promise.resolve(ready);
      return loadPromise;
    }

    // vs/loader.js installs GLOBAL define()/require() (AMD). A Service Portal page hosting
    // several widgets could already be running its own AMD loader - injecting ours on top would
    // silently break it. Refuse outright rather than fight it: this is exactly the situation the
    // fallback exists for, and it's cheaper to just not try than to attempt a snapshot/restore
    // that Monaco's own loader gives no clean way to undo once it succeeds.
    if (window.define && window.define.amd) {
      loadPromise = Promise.reject(new Error('Monaco load skipped - a foreign AMD loader is already on the page.'));
      loadPromise.catch(function (error) { console.warn(error.message); });
      return loadPromise;
    }

    loadPromise = new Promise(function (resolve, reject) {
      var settled = false;
      function finish(fn, arg) {
        if (settled) { return; }
        settled = true;
        $timeout.cancel(abortTimer);
        fn(arg);
      }

      installWorkerShim();

      var script = document.createElement('script');
      script.src = MONACO_BASE + '/vs/loader.js';
      script.onerror = function () {
        finish(reject, new Error('Failed to load Monaco loader script from ' + script.src));
      };
      script.onload = function () {
        try {
          window.require.config({ paths: { vs: MONACO_BASE + '/vs' } });
          window.require(['vs/editor/editor.main'], function () {
            // Unbind Monaco's own Cmd/Ctrl+K chord prefix globally, once, right here - this app's
            // ⌘K is already spoken for (the search palette, DocsUiService.setupPaletteShortcut).
            // command:null removes the binding outright rather than reassigning it, so Monaco
            // never enters "(⌘K) was pressed. Waiting for second key..." and the keydown bubbles
            // up to the palette's own document listener untouched.
            window.monaco.editor.addKeybindingRules([
              { keybinding: window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyK, command: null },
            ]);
            finish(resolve, window.monaco);
          }, function (error) {
            finish(reject, error);
          });
        } catch (error) {
          finish(reject, error);
        }
      };
      document.head.appendChild(script);

      // invokeApply=false: nothing downstream of this timeout needs an Angular digest - the
      // resulting rejection is only ever consumed by MarkdownEditorService's own promise chain.
      var abortTimer = $timeout(function () {
        finish(reject, new Error('Monaco load timed out after ' + LOAD_TIMEOUT_MS + 'ms'));
      }, LOAD_TIMEOUT_MS, false);
    });

    loadPromise = loadPromise.catch(function (error) {
      console.warn('Monaco editor failed to load - falling back to the built-in editor.', error);
      throw error;
    });

    return loadPromise;
  }

  return {
    loadMonaco: loadMonaco,
    getIfReady: getIfReady,
  };
}]);
