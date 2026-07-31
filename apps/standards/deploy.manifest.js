/* GlideFast Docs' deployment descriptor - the single source of truth for its deployment manifest,
   read by both scripts/build-deploy.js (Node) and the shared deploy console
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
    // Opt out of the shared SN Deployment Packager (console + build.js). Manifest kept for
    // reference / future re-enable; set deployable: true (or remove this key) to offer again.
    deployable: false,

    manifest: {
      appName: 'GlideFast Docs',
      scope: 'x_gf_docs',
      version: '1.0.0',
      vendorPrefix: 'x_gf',
      urlSuffix: 'glidefast-docs',
      shortDescription: 'GlideFast Docs - hosts reference documentation including the GlideFast scripting best-practices standards.',

      // A distinctive prefix (so this app's DERIVED sys_ids never collide with another app's).
      // No pinned sysIds map - this app has never been imported into a live instance, so there
      // are no legacy literal ids to preserve; every record derives from this prefix alone. See
      // core.js's deriveSysIds().
      sysIdPrefix: 'e9f0a1b2c3',

      angularModuleName: 'glidefastDocs',
      widgetScopeClass: 'gfd-widget',
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/docs.service.js', name: 'DocsService', type: 'service' },
        { file: 'js/services/docs-ui.service.js', name: 'DocsUiService', type: 'service' },
      ],
      stubProviders: [],   // no Deploy modal of its own, so nothing to stub in the deployed widget
      features: {},        // no roles/groups/ACLs - see this app's own brief for why
    },

    files: {
      controller: 'js/controllers/main.controller.js',
      scss: 'scss/app.scss',
      index: 'index.html',
    },
    serverScriptSource: '(function() {\n  /* No server-side data needed - the documentation content and its UI mechanics all live in the injected Angular services. */\n})();',
  };
});
