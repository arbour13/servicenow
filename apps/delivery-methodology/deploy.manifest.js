/* Delivery Methodology's deployment descriptor - the single source of truth for its deployment
   manifest, read by the shared tooling: the standalone deploy console
   (tools/sn-deployment-packager/deploy-console.html, which loads this as a <script src> like any
   other provider file) and the Node build.js CLI
   (`node tools/sn-deployment-packager/build.js delivery-methodology`, which require()s it - the UMD
   wrapper below is what makes both hosts work off the one file). See
   ../../tools/sn-deployment-packager/manifest.schema.md's "deploy.manifest.js" section for the
   contract. Every path below is relative to this file's own folder (apps/delivery-methodology/).
   This app has no build-deploy.js of its own and doesn't need one - both deploy hosts read this
   manifest directly.

   SCOPE: ONE WIDGET, deliberately, for now. The recorded plan (2026-07-24) is a four-widget split -
   one per main view: Journey, RACI, Reference, What's New. That is still the plan; it is NOT
   abandoned. It is blocked on APP restructuring, not on packaging: this app is currently a single
   MainController with internal view switching (c.view === 'journey' | 'raci' | 'reference' |
   'whatsnew'), and four widgets would need four controllers, four templates, and a shared state
   service - separate widgets don't share an Angular scope, so cross-view navigation that works
   today as a plain function call (c.jumpTo, RACI row -> that sub-phase in Journey) becomes
   cross-widget communication that doesn't exist yet.
   The packager is the smaller half of that problem: core.js's deriveSysIds() has a single
   hardcoded 'widget' seed and buildRecordModel pushes exactly one sp_widget + one sp_instance, so
   N widgets needs a loop and per-widget seeds there too.
   When the split happens, most of this file is unchanged - identity, scope, sysIdPrefix, providers
   and roles all stay as-is; what grows is the widget declaration. Nothing here needs undoing. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SNAppManifests = root.SNAppManifests || {};
    root.SNAppManifests['delivery-methodology'] = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    manifest: {
      appName: 'Delivery Methodology',

      // Fixed fallback only. This app derives its real scope per target instance (see
      // deployOptions.showConnection below) - the deploy host detects the instance's own vendor
      // prefix and recomputes scope via core.deriveScope(appName, companyCode), same as Glide
      // Studio. vendorPrefix is deliberately OMITTED so the core derives it rather than pinning a
      // wrong one; this literal is what you get if you build without connecting to an instance.
      scope: 'x_dlvry_method',
      version: '1.0.0',
      urlSuffix: 'delivery-methodology',
      shortDescription: 'Delivery Methodology - the GlideFast delivery journey: phases, sub-phases, RACI by task and job title, job aids, and an auto-generated change log.',

      // Distinctive 10-char prefix so this app's derived sys_ids never collide with another app's
      // in the same instance. Deliberately different from Glide Studio's b2c3d4e5f6 and Standards'
      // c7d8e9f0a1 (and from the retired Core app's e5f6a7b8c9, in case an instance still carries
      // its records). NEVER change this - every sys_id this app ships is derived from it, so
      // changing it means re-importing as a brand-new app instead of updating the existing one.
      sysIdPrefix: 'a4b5c6d7e8',
      // No `sysIds` pinning: this app has never been deployed, so there are no pre-existing
      // hand-picked literals to preserve. Everything derives from sysIdPrefix above.

      angularModuleName: 'deliveryMethodology',
      widgetScopeClass: 'dm-widget',
      // Service Portal's platform default. Template + controller bind as `c.` (not `vm.`).
      controllerAs: 'c',

      // One entry per file that REGISTERS an Angular provider. Note what's absent:
      // - js/app.module.js only declares the module (angular.module('deliveryMethodology', [])),
      //   it registers nothing - Service Portal owns the module, so it must not be listed.
      // - js/controllers/main.controller.js becomes the widget's own client_script via
      //   files.controller below, not an sp_angular_provider.
      // ThemeService is this app's OWN vendored copy as of 2026-07-26 (it used to be injected by
      // name from the shared Core app, which was retired that day) - so unlike Standards, it IS
      // listed here and DOES ship with this package.
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/data.service.js', name: 'DataService', type: 'service' },
      ],

      // Nothing to stub: this app has no dev-harness-only injections. Both providers above are
      // real and used by the deployed widget.
      stubProviders: [],

      // No roles/groups/ACLs. This is an internal reference document - it needs no access tier of
      // its own beyond whatever the host portal already enforces. Matches Standards' decision;
      // Glide Studio is the only app in the suite that opts into the roles layer.
      features: {},
    },

    files: {
      controller: 'js/controllers/main.controller.js',
      // The SCSS SOURCE, not css/app.css. The compiled file is the dev harness's own build output
      // (see the <link> in index.html); shipping it would bake in resolved values and defeat the
      // point of the widget's <css> field carrying authored SCSS for ServiceNow to compile.
      scss: 'scss/app.scss',
      index: 'index.html',
    },

    // No server-side data: everything the widget needs is client-side today (DataService is
    // seed + localStorage - see SCHEMA.md, the real table-backed data tier is designed but not
    // built). Replace this stub when that lands.
    serverScriptSource: '(function() {\n  /* No server-side data yet - DataService is client-side (seeded + localStorage). See SCHEMA.md for the table-backed data tier this becomes. */\n})();',

    // This app authors its own complete palette as CSS custom properties rather than consuming the
    // suite's shared $token !default partials, so there is nothing to inline. NOTE: a full
    // "adopt the host portal's theme" refactor is planned (convert ~60 hardcoded custom properties
    // to $token: value !default) - when that lands, this key gains
    // ['../../tools/theme-foundation/_tokens.scss'].
    sharedScssPartials: undefined,

    // Show the "Deploy target instance" panel (URL / user / password / Detect Prefix). This app's
    // scope is meant to be set from the target instance's own vendor prefix at deploy time rather
    // than hardcoded, which is exactly what this panel drives.
    deployOptions: { showConnection: true },
  };
});
