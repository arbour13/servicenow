/* Standards' deployment descriptor - the single source of truth for its deployment manifest, read
   by both scripts/build-deploy.js (Node) and the shared deploy console
   (tools/sn-deployment-packager/index.html, browser). See
   ../../tools/sn-deployment-packager/manifest.schema.md's
   "deploy.manifest.js" section for the contract. Every path below is relative to this file's own
   folder (apps/standards/). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SNAppManifests = root.SNAppManifests || {};
    root.SNAppManifests['standards'] = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    manifest: {
      appName: 'GlideFast Standards Portal',
      scope: 'x_gfsp_standards',
      version: '1.0.0',
      vendorPrefix: 'x_gfsp',
      urlSuffix: 'glidefast-standards',
      shortDescription: 'GlideFast Standards Portal - hosts the GlideFast scripting best-practices reference document.',

      // A distinctive prefix (so this app's DERIVED sys_ids never collide with another app's),
      // plus the EXACT legacy literals this app shipped before it delegated to the shared core -
      // pinning these means re-importing this package updates the same records rather than
      // duplicating them if this was ever already imported into an instance. See
      // core.js's deriveSysIds().
      sysIdPrefix: 'c7d8e9f0a1',
      sysIds: {
        app: 'c7d8e9f0a10000112233440001',
        widget: 'c7d8e9f0a10000112233440002',
        theme: 'c7d8e9f0a10000112233440003',
        portal: 'c7d8e9f0a10000112233440004',
        page: 'c7d8e9f0a10000112233440005',
        container: 'c7d8e9f0a10000112233440006',
        row: 'c7d8e9f0a10000112233440007',
        column: 'c7d8e9f0a10000112233440008',
        instance: 'c7d8e9f0a10000112233440009',
      },

      angularModuleName: 'standardsPortal',
      widgetScopeClass: 'gfsp-widget',
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/standards.service.js', name: 'StandardsService', type: 'service' },
        { file: 'js/services/standards-ui.service.js', name: 'StandardsUiService', type: 'service' },
      ],
      stubProviders: [],   // no Deploy modal of its own, so nothing to stub in the deployed widget
      features: {},        // no roles/groups/ACLs - see this app's own brief for why
    },

    files: {
      controller: 'js/controllers/main.controller.js',
      scss: 'scss/app.scss',
      index: 'index.html',
    },
    serverScriptSource: '(function() {\n  /* No server-side data needed - the document and its UI mechanics all live in the injected Angular services. */\n})();',
  };
});
