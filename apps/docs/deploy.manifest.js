/* GlideFast Docs' deployment descriptor - the single source of truth for its deployment manifest,
   read by both tools/sn-deployment-packager/build.js (Node CLI) and the shared deploy console
   (tools/sn-deployment-packager/index.html, browser). See
   ../../tools/sn-deployment-packager/manifest.schema.md's
   "deploy.manifest.js" section for the contract. Every path below is relative to this file's own
   folder (apps/docs/). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SNAppManifests = root.SNAppManifests || {};
    root.SNAppManifests['docs'] = factory();
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
      // Every service MainController injects has to be here - a missing one is not a degraded
      // feature but a hard Angular DI failure that stops the whole widget bootstrapping.
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/docs.service.js', name: 'DocsService', type: 'service' },
        { file: 'js/services/docs-edit.service.js', name: 'DocsEditService', type: 'service' },
        { file: 'js/services/docs-highlight.service.js', name: 'DocsHighlightService', type: 'service' },
        { file: 'js/services/docs-ui.service.js', name: 'DocsUiService', type: 'service' },
      ],
      stubProviders: [],   // no Deploy modal of its own, so nothing to stub in the deployed widget
      features: { roles: true },

      // No userRoleName - reading is intentionally NOT role-gated (any portal visitor can read
      // published pages). Mutating actions in docs.server.js use gs.getCurrentScopeName() +
      // '.editor' / '.admin' — short suffixes here; packager emits <scope>.editor / .admin.
      roles: {
        editorRoleName: 'editor',
        adminRoleName: 'admin',
        editorGroupName: 'GlideFast Docs Editors',
        adminGroupName: 'GlideFast Docs Admins',
        editorRoleDescription: 'Can save draft edits to GlideFast Docs pages.',
        adminRoleDescription: 'Can save and publish GlideFast Docs pages, and seed standard content.',
      },

      // Two tables, not one self-referencing node table (contrast Delivery Methodology's
      // <scope>_content) - a page's content is a fixed two-level group->page hierarchy, not an
      // arbitrary/evolving tree, so explicit typed tables read better than a generic type+JSON-blob
      // node. markdown/html/draftMarkdown/draftHtml are `json` columns not `string` - same reason
      // Delivery Methodology's content body is `json`: no meaningful length ceiling. draftMarkdown/
      // draftHtml hold an in-progress edit separate from the published markdown/html, so a page
      // being edited never changes what readers see until Publish (see docs.server.js).
      tables: [
        { name: 'group', label: 'Docs Group', columns: [
          { name: 'slug', type: 'string', maxLength: 60, label: 'Slug' },
          { name: 'title', type: 'string', maxLength: 150, label: 'Title' },
          { name: 'order', type: 'integer', label: 'Order' },
          { name: 'planned', type: 'json', label: 'Planned page titles' },
        ]},
        { name: 'page', label: 'Docs Page', columns: [
          { name: 'group', type: 'reference', reference: 'group', label: 'Group', cascadeRule: 'cascade' },
          { name: 'slug', type: 'string', maxLength: 80, label: 'Slug' },
          { name: 'title', type: 'string', maxLength: 150, label: 'Title' },
          { name: 'order', type: 'integer', label: 'Order' },
          { name: 'markdown', type: 'json', label: 'Markdown (published)' },
          { name: 'html', type: 'json', label: 'HTML (published, rendered)' },
          { name: 'draftMarkdown', type: 'json', label: 'Markdown (draft)' },
          { name: 'draftHtml', type: 'json', label: 'HTML (draft, rendered)' },
          { name: 'draftUpdatedBy', type: 'string', maxLength: 100, label: 'Draft last edited by' },
          { name: 'draftUpdatedOn', type: 'string', maxLength: 40, label: 'Draft last edited on' },
        ]},
      ],
    },

    files: {
      controller: 'js/controllers/main.controller.js',
      scss: 'scss/app.scss',
      index: 'index.html',
      // Prefixed onto the widget server script at package time: the markdown renderer
      // (DocsRenderer - the same render logic scripts/build-docs.js runs at build time, ported to
      // run at runtime against table rows) loads first since docs.server.js calls it directly;
      // the generated standard-content seed payload (DocsStandardContent) has no dependency on
      // either and is placed last, right before the script that uses it - same ordering rationale
      // as Delivery Methodology's contentModel.
      contentModel: [
        'js/lib/docs-renderer.js',
        'js/data/standard-content.js',
      ],
      serverScript: 'js/server/docs.server.js',
    },
  };
});
