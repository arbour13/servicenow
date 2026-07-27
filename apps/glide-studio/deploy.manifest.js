/* Glide Studio's deployment descriptor - the single source of truth for its deployment manifest,
   read by the shared tooling: the standalone deploy console (tools/sn-deployment-packager/index.html,
   loaded as a <script src> like any other provider file) and the Node build.js CLI
   (`node tools/sn-deployment-packager/build.js glide-studio`, which require()s this file - the UMD
   wrapper below is what makes both hosts work off the one file). See
   ../../tools/sn-deployment-packager/manifest.schema.md's "deploy.manifest.js" section for the
   contract. Every path below is relative to this file's own folder (apps/glide-studio/). This app
   has no build-deploy.js of its own - it doesn't need one, since both deploy hosts already read this
   manifest directly. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SNAppManifests = root.SNAppManifests || {};
    root.SNAppManifests['glide-studio'] = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // sysIds pins this app's ORIGINAL hand-picked literals (from before this file delegated to the
  // shared core) so migrating onto the core updates the SAME records on re-import rather than
  // creating duplicates - see core.js's deriveSysIds() doc comment.
  var SYS_ID_PREFIX = 'b2c3d4e5f6';
  var LEGACY_SYS_IDS = {
    app: 'b2c3d4e5f60000112233445566778801',
    widget: 'b2c3d4e5f60000112233445566778802',
    theme: 'b2c3d4e5f60000112233445566778803',
    portal: 'b2c3d4e5f60000112233445566778804',
    page: 'b2c3d4e5f60000112233445566778805',
    container: 'b2c3d4e5f60000112233445566778806',
    row: 'b2c3d4e5f60000112233445566778807',
    column: 'b2c3d4e5f60000112233445566778808',
    instance: 'b2c3d4e5f60000112233445566778809',
    userRole: 'b2c3d4e5f6000011223344556677880c',
    adminRole: 'b2c3d4e5f6000011223344556677880d',
    userGroup: 'b2c3d4e5f6000011223344556677880e',
    adminGroup: 'b2c3d4e5f6000011223344556677880f',
    userGroupRole: 'b2c3d4e5f60000112233445566778810',
    adminGroupRole: 'b2c3d4e5f60000112233445566778811',
  };

  return {
    // Opt out of the shared SN Deployment Packager (console + build.js). Manifest kept for
    // reference / future re-enable; set deployable: true (or remove this key) to offer again.
    deployable: false,

    manifest: {
      appName: 'Glide Studio',
      scope: 'x_glide_studio_ng',
      version: '1.0.0',
      urlSuffix: 'glide-studio-ng',
      shortDescription: 'Glide Studio (AngularJS rebuild) - visual builder for ServiceNow GlideRecord, GlideAjax, GlideAggregate, Script Include, and Encoded Query scripts.',
      sysIdPrefix: SYS_ID_PREFIX,
      sysIds: LEGACY_SYS_IDS,
      angularModuleName: 'glideStudio',
      widgetScopeClass: 'gsb-widget',
      // One entry per file that registers an Angular provider. type: 'service' | 'directive'.
      // (MainController isn't listed here - it becomes the widget's client_script, not a provider.)
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/confirm-modal.service.js', name: 'ConfirmModalService', type: 'service' },
        { file: 'js/directives/gs-modal.directive.js', name: 'gsModal', type: 'directive' },
        { file: 'js/directives/gs-sync-attr.directive.js', name: 'gsSyncAttr', type: 'directive' },
        { file: 'js/services/schema.service.js', name: 'SchemaService', type: 'service' },
        { file: 'js/services/codegen.service.js', name: 'CodegenService', type: 'service' },
        { file: 'js/services/aggregate.service.js', name: 'AggregateService', type: 'service' },
        { file: 'js/services/ajax.service.js', name: 'AjaxService', type: 'service' },
        { file: 'js/services/encoder.service.js', name: 'EncoderService', type: 'service' },
        { file: 'js/services/scriptinclude.service.js', name: 'ScriptIncludeService', type: 'service' },
        { file: 'js/services/glidequery.service.js', name: 'GlideQueryService', type: 'service' },
        { file: 'js/services/standards.service.js', name: 'StandardsService', type: 'service' },
        { file: 'js/services/example-call.service.js', name: 'ExampleCallService', type: 'service' },
        { file: 'js/services/connection.service.js', name: 'ConnectionService', type: 'service' },
        { file: 'js/services/connection-ui.service.js', name: 'ConnectionUiService', type: 'service' },
        { file: 'js/services/schema-live.service.js', name: 'SchemaLiveService', type: 'service' },
        { file: 'js/services/schema-ui.service.js', name: 'SchemaUiService', type: 'service' },
        { file: 'js/services/preview-ui.service.js', name: 'PreviewUiService', type: 'service' },
        { file: 'js/services/standards-ui.service.js', name: 'StandardsUiService', type: 'service' },
        { file: 'js/directives/gs-select.directive.js', name: 'gsSelect', type: 'directive',
          // gs-select.directive.js has one extra top-level statement after its own .directive()
          // call: a shared (not per-instance) document scroll listener that closes any open
          // dropdown. Real Angular Providers have no "run block" to hang a standalone side effect
          // off of, so it's folded into the widget's own client_script instead (run once per
          // widget instance - equivalent in effect, since there's only ever one instance of this
          // widget on a page).
          trailingMarker: "document.addEventListener('scroll'" },
        { file: 'js/directives/gs-condition-groups.directive.js', name: 'gsConditionGroups', type: 'directive' },
      ],
      features: { roles: true },
      roles: {
        userRoleName: 'glide_studio_user',
        adminRoleName: 'glide_studio_admin',
        userGroupName: 'Glide Studio Users',
        adminGroupName: 'Glide Studio Admins',
      },
    },

    files: {
      controller: 'js/controllers/main.controller.js',
      // The SCSS SOURCE, not css/app.css (the compiled build output this dev harness's own <link>
      // tag uses) - shipping the compiled file would bake in literal hex colors and sever the
      // whole point of authoring this as SCSS: the $gs-* variable references need to reach
      // ServiceNow as live references so the widget's own !default fallback / the portal's real
      // theme can each take over as appropriate. See scss/app.scss's header comment.
      scss: 'scss/app.scss',
      index: 'index.html',
    },
    serverScriptSource: '(function() {\n  /* Server logic lives in the injected Angular services (ConnectionService/SchemaLiveService) - this widget needs no server-side data of its own. */\n})();',
    // This app supports live-instance prefix detection (its own Deploy modal already has this) -
    // shows the "Deploy target instance" URL/username/password + Detect Prefix UI. Standards/Core
    // have no dynamic scope story, so they omit this (default: hidden). See
    // ../../tools/sn-deployment-packager/manifest.schema.md's "deploy.manifest.js" section.
    deployOptions: { showConnection: true },
  };
});
