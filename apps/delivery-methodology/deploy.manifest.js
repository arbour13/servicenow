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
      // SN app / portal / widget display name. Journey page h1 is "Methodology" (matches the
      // view tab); "Delivery 2.0" lives as portal pageTitle / browser tab - brand chrome for
      // stakeholders, not the in-app section heading. Scope / urlSuffix / folder stay as
      // delivery-methodology tech identity so renaming display text does not mint a second
      // scoped app on redeploy.
      appName: 'Delivery Methodology',

      // Fixed fallback only. This app derives its real scope per target instance (see
      // deployOptions.showConnection below) - the deploy host detects the instance's own vendor
      // prefix and recomputes scope via core.deriveScope(appName, companyCode), same as Glide
      // Studio. vendorPrefix is deliberately OMITTED so the core derives it rather than pinning a
      // wrong one; this literal is what you get if you build without connecting to an instance.
      scope: 'x_dlvry_method',
      version: '1.0.0',
      // Still iterating on the target instance — packager allows redeploy at the same version and
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
      // - js/controllers/main.controller.js becomes the widget's own client_script via
      //   files.controller below, not an sp_angular_provider.
      // ThemeService is this app's OWN vendored copy as of 2026-07-26 (it used to be injected by
      // name from the shared Core app, which was retired that day) - so unlike Standards, it IS
      // listed here and DOES ship with this package.
      providers: [
        { file: 'js/services/theme.service.js', name: 'ThemeService', type: 'service' },
        { file: 'js/services/data.service.js', name: 'DataService', type: 'service' },
        // Harness-only play data (window.DMSeed). deploy: false → packager skips this file entirely
        // so the instance widget stays thin. Local index.html still loads it before DataService.
        { file: 'js/data/seed.js', name: 'DMSeed', type: 'script', deploy: false },
      ],

      // Nothing to stub: this app has no dev-harness-only injections. Both providers above are
      // real and used by the deployed widget.
      stubProviders: [],

      // No own portal/theme - this widget drops onto an existing host portal page (or the packaged
      // sp_page is wired into one manually). Roles gate the page and the content table: user =
      // view; editor + admin = edit content in the tool; admin also gets write ACLs on app metadata.
      features: { portal: false, theme: false, roles: true },

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

      // One self-referencing content table — see SCHEMA.md. Short name becomes
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
      controller: 'js/controllers/main.controller.js',
      // The SCSS SOURCE, not css/app.css. The compiled file is the dev harness's own build output
      // (see the <link> in index.html); shipping it would bake in resolved values and defeat the
      // point of the widget's <css> field carrying authored SCSS for ServiceNow to compile.
      scss: 'scss/app.scss',
      index: 'index.html',
      // Prefixed onto the widget server script at package time (hydrate/dehydrate).
      contentModel: 'js/lib/content-model.js',
      serverScript: 'js/server/content.server.js',
    },

    // Inline serverScriptSource omitted — hosts concatenate files.contentModel + files.serverScript.

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
