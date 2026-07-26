/* Core's deployment descriptor - the single source of truth for its deployment manifest, read by
   both scripts/build-deploy.js (Node) and the shared deploy console
   (tools/sn-deployment-packager/index.html, browser). See
   ../../tools/sn-deployment-packager/manifest.schema.md's
   "deploy.manifest.js" section for the contract. Every path below is relative to this file's own
   folder (apps/core/). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SNAppManifests = root.SNAppManifests || {};
    root.SNAppManifests['core'] = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    manifest: {
      appName: 'Core',
      scope: 'x_core_core',
      version: '1.0.0',
      vendorPrefix: 'x_core',
      urlSuffix: 'core',
      shortDescription: 'Core - shared foundation app: reusable AngularJS providers and a generic documentation/wiki widget for the ServiceNow app suite.',

      // Distinctive prefix so Core's derived sys_ids never collide with another app's (Glide Studio
      // uses b2c3d4e5f6, Standards c7d8e9f0a1). New app - everything derived, nothing pinned.
      sysIdPrefix: 'e5f6a7b8c9',

      angularModuleName: 'core',
      widgetScopeClass: 'core-widget',
      // Shared providers Core hosts - consumer apps inject these by name.
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/confirm-modal.service.js', name: 'ConfirmModalService', type: 'service' },
        { file: 'js/services/doc-viewer.service.js', name: 'DocViewerService', type: 'service' },
        { file: 'js/directives/core-modal.directive.js', name: 'coreModal', type: 'directive' },
        { file: 'js/directives/core-sync-attr.directive.js', name: 'coreSyncAttr', type: 'directive' },
        { file: 'js/directives/core-doc.directive.js', name: 'coreDoc', type: 'directive' },
        // Core's own doc content (not shared machinery, but ships with Core's widget).
        { file: 'js/services/core-docs.data.js', name: 'CoreDocsService', type: 'service' },
      ],
      stubProviders: [],
      features: {},
    },

    files: {
      controller: 'js/controllers/main.controller.js',
      scss: 'scss/app.scss',
      index: 'index.html',
    },
    serverScriptSource: '(function() {\n  /* Core needs no server-side data of its own - its providers are client-side and its widget is presentational. */\n})();',
    // Shared SCSS token partial(s) inlined into the widget's own <css> ahead of this app's rules -
    // so the widget carries the suite's `!default` tokens and stays portal-portable. See
    // tools/sn-deployment-packager buildParts (sources.sharedScss) and tools/theme-foundation/SETUP.md.
    sharedScssPartials: ['../../tools/theme-foundation/_tokens.scss'],
  };
});
