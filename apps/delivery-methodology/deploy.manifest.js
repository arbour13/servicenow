/* Delivery Methodology's deployment descriptor - the single source of truth for its deployment
   manifest, read by the shared tooling: the standalone deploy console
   (tools/sn-deployment-packager/index.html, which loads this as a <script src> like any
   other provider file) and the Node build.js CLI
   (`node tools/sn-deployment-packager/build.js delivery-methodology`, which require()s it - the UMD
   wrapper below is what makes both hosts work off the one file). See
   ../../tools/sn-deployment-packager/manifest.schema.md's "deploy.manifest.js" section for the
   contract. Every path below is relative to this file's own folder (apps/delivery-methodology/).
   This app has no build-deploy.js of its own and doesn't need one - both deploy hosts read this
   manifest directly. Operator how-to: ../../tools/sn-deployment-packager/README.md.

   SCOPE: FIVE WIDGETS, landed 2026-07-28 - the four-widget-split plan recorded 2026-07-24, plus a
   fifth for the chrome that has to be always mounted. One per main view (Methodology, RACI,
   Reference, What's New) PLUS Shell (pagehdr, tip/toast/confirm overlays, search, loading - see
   js/controllers/shell.controller.js's header comment). The old single MainController with
   internal view switching (c.view === 'methodology' | 'raci' | 'reference' | 'whatsnew') is gone;
   AppStateService.view now gates which view widget's template renders (each view controller's own
   isActiveView()), and cross-widget sync runs on $rootScope.$broadcast('dm-state') - see
   AppStateService's header comment for the full writeup, and
   ServiceNow/apps/delivery-methodology/CLAUDE.md for the app-level summary.
   Shell is the ONLY widget with serverScript: true (js/server/content.server.js) - it owns the
   bootstrap getData()/applyLoadedData() call and the one ContentEditService.bind()/
   StructureEditService.bind()/NavigationService.bind() call; the four view widgets get the
   packager's noop server-script stub (they have no server-side data of their own). */
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
      // SN app / portal / widget display name. Methodology page h1 is "Methodology" (matches the
      // view tab); "Delivery 2.0" lives as portal pageTitle / browser tab - brand chrome for
      // stakeholders, not the in-app section heading. Scope / urlSuffix / folder stay as
      // delivery-methodology tech identity so renaming display text does not mint a second
      // scoped app on redeploy.
      appName: 'Delivery Methodology',

      // No fixed scope - showConnection derives it per target instance (vendor prefix + App ID).
      // CLI builds must pass --scope=…; never hardcode a placeholder scope here.
      version: '1.0.0',
      // Still iterating on the target instance - packager allows redeploy at the same version and
      // does not force semver bumps. Flip to false (or remove) when this app is release-ready.
      development: true,
      urlSuffix: 'delivery-methodology',
      // SP page/widget id slug (hyphens→underscores from urlSuffix by default). Page title is the
      // in-portal display brand; appName stays the scoped-app / widget name.
      pageTitle: 'Delivery 2.0',
      shortDescription: 'GlideFast delivery methodology: phases, sub-phases, RACI by task and job title, job aids, and an auto-generated change log.',

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
      // - Each of the five controllers (widgets[] below) becomes ITS OWN widget's client_script,
      //   not an sp_angular_provider - see widgets[] below, not files.controller (multi-widget
      //   apps have no single files.controller; each widget brings its own).
      // ThemeService is this app's OWN vendored copy as of 2026-07-26 (it used to be injected by
      // name from the shared Core app, which was retired that day) - so unlike Standards, it IS
      // listed here and DOES ship with this package.
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/motion.service.js', name: 'MotionService', type: 'service' },
        { file: 'js/services/data.service.js', name: 'DataService', type: 'service' },
        { file: 'js/services/live-sync.service.js', name: 'LiveSyncService', type: 'service' },
        { file: 'js/services/methodology-domain.service.js', name: 'MethodologyDomainService', type: 'service' },
        { file: 'js/services/app-state.service.js', name: 'AppStateService', type: 'service' },
        { file: 'js/services/analytics.service.js', name: 'AnalyticsService', type: 'service' },
        { file: 'js/services/changelog-diff.service.js', name: 'ChangelogDiffService', type: 'service' },
        { file: 'js/services/raci-grid.service.js', name: 'RaciGridService', type: 'service' },
        { file: 'js/services/navigation.service.js', name: 'NavigationService', type: 'service' },
        { file: 'js/services/search.service.js', name: 'SearchService', type: 'service' },
        { file: 'js/services/whats-new.service.js', name: 'WhatsNewService', type: 'service' },
        { file: 'js/services/reference.service.js', name: 'ReferenceService', type: 'service' },
        { file: 'js/services/id-seq.service.js', name: 'IdSeqService', type: 'service' },
        { file: 'js/services/icon.service.js', name: 'IconService', type: 'service' },
        { file: 'js/services/tip.service.js', name: 'TipService', type: 'service' },
        { file: 'js/services/jargon.service.js', name: 'JargonService', type: 'service' },
        { file: 'js/services/messaging.service.js', name: 'MessagingService', type: 'service' },
        { file: 'js/services/url-policy.service.js', name: 'UrlPolicyService', type: 'service' },
        { file: 'js/services/content-edit.service.js', name: 'ContentEditService', type: 'service' },
        { file: 'js/services/structure-edit.service.js', name: 'StructureEditService', type: 'service' },
        { file: 'js/services/reference-edit.service.js', name: 'ReferenceEditService', type: 'service' },
        { file: 'js/directives/dm-modal.directive.js', name: 'dmModal', type: 'directive' },
        { file: 'js/directives/dm-reorder.directive.js', name: 'dmReorder', type: 'directive' },
        { file: 'js/directives/dm-combo.directive.js', name: 'dmCombo', type: 'directive' },
        // Harness-only play data (window.DMSeed). deploy: false → packager skips this file entirely
        // so the instance widget stays thin. Local index.html still loads it before DataService.
        { file: 'js/data/seed.js', name: 'DMSeed', type: 'script', deploy: false },
      ],

      // Nothing to stub: this app has no dev-harness-only injections. The providers above are
      // real and used by the deployed widget.
      stubProviders: [],

      // Five sp_widget + sp_instance records, stacked in this array's order in the one sp_column
      // (see core.js's deriveSysIds()/buildRecordModel() - each id below seeds its own widget_<id>/
      // instance_<id> sys_id pair, and NEVER renames after first deploy). Shell's templateFile
      // (partials/shell.html) already authors its own always-visible root div/attributes (pagehdr,
      // tip/toast/confirm, search, loading) - see manifest.schema.md's widgets[] doc on
      // templateFile vs templatePartial. The four view widgets' templatePartial fragments each get
      // wrapped by the packager as `<div class="app app--view" id="dm-panel-<id>" role="tabpanel"
      // aria-labelledby="dm-tab-<id>" ng-show="c.isActiveView()">...fragment...</div>` - matching
      // the harness index.html so Shell aria-controls resolve after deploy.
      widgets: [
        {
          id: 'shell',
          name: 'DM Shell',
          widgetId: 'dm_shell',
          controller: 'js/controllers/shell.controller.js',
          templateFile: 'partials/shell.html',
          // The ONE widget that gets the real content-table server script - see this file's SCOPE
          // comment above and shell.controller.js's header comment.
          serverScript: true,
        },
        {
          id: 'methodology',
          name: 'DM Methodology',
          widgetId: 'dm_methodology',
          controller: 'js/controllers/methodology.controller.js',
          templatePartial: 'partials/methodology.html',
        },
        {
          id: 'raci',
          name: 'DM RACI',
          widgetId: 'dm_raci',
          controller: 'js/controllers/raci.controller.js',
          templatePartial: 'partials/raci.html',
        },
        {
          id: 'reference',
          name: 'DM Reference',
          widgetId: 'dm_reference',
          controller: 'js/controllers/reference.controller.js',
          templatePartial: 'partials/reference.html',
        },
        {
          id: 'whatsnew',
          name: "DM What's New",
          widgetId: 'dm_whatsnew',
          controller: 'js/controllers/whatsnew.controller.js',
          templatePartial: 'partials/whatsnew.html',
        },
      ],

      // No own portal/theme - this widget drops onto an existing host portal page (or the packaged
      // sp_page is wired into one manually). Roles gate the page and the content table: user =
      // view; editor + admin = edit content in the tool; admin also gets write ACLs on app metadata.
      features: { portal: false, theme: false, roles: true },

      // Short suffixes only - the packager emits scoped names (<scope>.user / .editor / .admin).
      // content.server.js builds the same strings from gs.getCurrentScopeName() for hasRole().
      roles: {
        userRoleName: 'user',
        editorRoleName: 'editor',
        adminRoleName: 'admin',
        userGroupName: 'Delivery Methodology Users',
        editorGroupName: 'Delivery Methodology Editors',
        adminGroupName: 'Delivery Methodology Admins',
        userRoleDescription: 'Can view the Delivery Methodology tool (read-only).',
        editorRoleDescription: 'Can edit Delivery Methodology content in the tool.',
        adminRoleDescription: 'Can edit Delivery Methodology content and the application’s own records.',
      },

      // One self-referencing content table - see SCHEMA.md. Short name becomes
      // <scope>_content at emit time. Parent cascade deletes descendants.
      tables: [
        {
          name: 'content',
          label: 'Content',
          columns: [
            {
              name: 'type',
              type: 'choice',
              label: 'Type',
              choices: [
                { value: 'methodology', label: 'Methodology' },
                { value: 'phase', label: 'Phase' },
                { value: 'sub_phase', label: 'Sub-phase' },
                { value: 'task', label: 'Task' },
                { value: 'raci', label: 'RACI' },
                { value: 'job_aid', label: 'Job aid' },
                { value: 'job_aid_role', label: 'Job aid role' },
                { value: 'input', label: 'Input' },
                { value: 'deliverable', label: 'Deliverable' },
                { value: 'comment', label: 'Comment' },
                { value: 'participant', label: 'Participant' },
                { value: 'meeting', label: 'Meeting' },
                { value: 'level_of_effort', label: 'Level of effort' },
                { value: 'changelog_entry', label: 'Changelog entry' },
                { value: 'job_title', label: 'Job title' },
                { value: 'glossary_term', label: 'Glossary term' },
                { value: 'reference_section', label: 'Reference section' },
              ],
            },
            {
              name: 'parent',
              type: 'reference',
              reference: 'content',
              label: 'Parent',
              cascadeRule: 'cascade',
            },
            { name: 'name', type: 'string', maxLength: 150, label: 'Name' },
            { name: 'order', type: 'integer', label: 'Order' },
            { name: 'content', type: 'json', label: 'Content' },
          ],
        },
      ],
    },

    files: {
      // No files.controller: this is a multi-widget app (manifest.widgets above) - each widget
      // brings its own controller file instead (widgets[].controller).
      // The SCSS SOURCE, not css/app.css. The compiled file is the dev harness's own build output
      // (see the <link> in index.html); shipping it would bake in resolved values and defeat the
      // point of the widget's <css> field carrying authored SCSS for ServiceNow to compile.
      scss: 'scss/app.scss',
      // Still read by the packager (build.js/console.js always load files.index), but unused by
      // buildParts() here: every widgets[] entry declares its own templateFile/templatePartial, so
      // none falls into the "neither -> extract from indexHtml" branch. Kept only because
      // files.index is a required manifest key.
      index: 'index.html',
      // No files.viewPartials: each view widget's fragment is now declared directly on its own
      // widgets[] entry (templatePartial) instead of being inlined into one shared template.
  // Prefixed onto the widget server script at package time (url policy + hydrate/dehydrate,
  // then the standard-content starter payload the importStandardContent action inserts on an empty
  // instance). Array order matters: DMUrlPolicy must load before DMContentModel; standard-content
  // has no dependency on either, so it's placed last, right before the script that uses it.
  contentModel: [
    'js/lib/url-policy.js',
    'js/lib/content-model.js',
    'js/data/standard-content.js',
  ],
  serverScript: 'js/server/content.server.js',
},
    // Inline serverScriptSource omitted - hosts concatenate files.contentModel + files.serverScript.

    // App-local scss/_tokens.scss supplies $var: value !default for the core palette (compiled
    // into :root custom properties). Inlined at package time so ServiceNow's widget SCSS compile
    // never sees a dangling @import 'tokens' (that fails on the instance and ships no styles).
    sharedScssPartials: ['scss/_tokens.scss'],

    // Show the "Deploy target instance" panel (URL / user / password / Detect Prefix). This app's
    // scope is meant to be set from the target instance's own vendor prefix at deploy time rather
    // than hardcoded, which is exactly what this panel drives.
    deployOptions: { showConnection: true },
  };
});
