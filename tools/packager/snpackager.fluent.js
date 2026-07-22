/* Fluent (ServiceNow Now SDK) serializer - the second output target of the packager, parallel to
   snpackager.core.js's assembleXml(). Where assembleXml() emits ONE Update Set <unload> string,
   assembleFluent() emits a whole Now SDK TypeScript PROJECT as a file-map ({ 'relative/path':
   'contents' }); the host (the deploy console) zips and downloads it. Pure and I/O-free, same as
   the core - it takes the already-extracted `parts` (from core.buildParts) plus the manifest, and
   returns data. No fetch, no fs, no zip here.

   WHAT MAPS TO WHAT (verified against ServiceNow/sdk-examples' service-portal-sample, 2026-07):
   - The widget and each Angular provider use Fluent's TYPED APIs (SPWidget / SPAngularProvider from
     '@servicenow/sdk/core'). SPWidget maps almost 1:1 onto core.buildParts's output; its template/
     css/client/server are external files pulled via Now.include('<file>') (relative to the .now.ts).
   - Everything else - the sp_page/container/row/column/instance page tree, sp_portal, sp_theme, and
     the optional roles/groups/ACL layer - has no typed Fluent API in the SDK, so it's emitted via
     the GENERIC Record({ $id, table, data }) API, exactly as the official sample does for its own
     page tree and portal. Reference fields carry the concrete sys_id string of the referenced
     record (whose own $id key resolves to that same sys_id via generated/keys.ts).

   IDENTITY: every record's sys_id comes from the SAME core.deriveSysIds()/stableSysId() the XML
   path uses, so a Fluent-installed app and an XML-installed app are the same records - re-importing
   one over the other updates in place instead of duplicating. generated/keys.ts pins each Now.ID
   key to its {table, id:<that sys_id>}.

   The controller uses `vm` (SPWidget's controllerAs default is 'c', so we set it explicitly). We do
   NOT list angularProviders on the widget: providers deploy as their own sp_angular_provider records
   and AngularJS injects them BY NAME from the shared page injector at runtime - same as the XML path,
   which also creates no widget->provider m2m link. Omitting it keeps keys.ts free of composite m2m
   entries and matches the XML behavior exactly. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./snpackager.core.js'));
  } else {
    root.SNPackager = root.SNPackager || {};
    root.SNPackager.fluent = factory(root.SNPackager.core);
  }
})(typeof self !== 'undefined' ? self : this, function (core) {
  'use strict';

  // --- small renderers for embedding values in generated .now.ts source ---
  function jsStr(s) {
    return "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '') + "'";
  }
  function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app';
  }

  // Renders a generic Record({ $id, table, data }) block. `data` is a plain object of SHORT scalar
  // fields (strings/bools/numbers) - long content (scripts/templates/css) never goes here, it goes
  // to external files referenced from the typed SPWidget/SPAngularProvider instead.
  function renderRecord(key, table, data) {
    var lines = Object.keys(data).map(function (f) {
      var v = data[f];
      var rendered = typeof v === 'boolean' || typeof v === 'number' ? String(v) : jsStr(v);
      return '        ' + f + ': ' + rendered + ',';
    });
    return "Record({\n    $id: Now.ID[" + jsStr(key) + "],\n    table: " + jsStr(table) +
      ",\n    data: {\n" + lines.join('\n') + "\n    },\n})";
  }

  /* ==================================================================================
     assembleFluent(manifest, parts, opts) -> { 'relative/path': 'file contents', ... }
     opts.mode: 'project' (default) emits a full runnable Now SDK project (package.json,
     now.config.json, generated/keys.ts, README); 'files' emits just the src/fluent/** tree to drop
     into an existing SDK project. opts.sdkVersion overrides the @servicenow/sdk dependency range.
     ================================================================================== */
  function assembleFluent(manifest, parts, opts) {
    opts = opts || {};
    var mode = opts.mode === 'files' ? 'files' : 'project';
    var ids = core.deriveSysIds(manifest);
    var slug = slugify(manifest.appName);
    var files = {};
    var keyRegistry = []; // { key, table, id } - drives generated/keys.ts

    function record(key, table, id, data) {
      keyRegistry.push({ key: key, table: table, id: id });
      return renderRecord(key, table, data);
    }

    /* ---- 1. the widget: typed SPWidget + its four external asset files ---- */
    var widgetId = manifest.scope + '_widget';
    keyRegistry.push({ key: 'widget', table: 'sp_widget', id: ids.widget });
    files['src/fluent/widgets/' + slug + '.client.js'] = parts.clientScript;
    files['src/fluent/widgets/' + slug + '.html'] = parts.template;
    files['src/fluent/widgets/' + slug + '.scss'] = parts.css;
    files['src/fluent/widgets/' + slug + '.server.js'] = parts.serverScript;

    var widgetTs =
      "import { SPWidget } from '@servicenow/sdk/core'\n\n" +
      "SPWidget({\n" +
      "    $id: Now.ID['widget'],\n" +
      "    name: " + jsStr(manifest.appName) + ",\n" +
      "    id: " + jsStr(widgetId) + ",\n" +
      "    description: " + jsStr(manifest.shortDescription || manifest.appName) + ",\n" +
      "    controllerAs: 'vm',\n" +
      "    hasPreview: true,\n" +
      "    category: 'custom',\n" +
      "    clientScript: Now.include('" + slug + ".client.js'),\n" +
      "    serverScript: Now.include('" + slug + ".server.js'),\n" +
      "    htmlTemplate: Now.include('" + slug + ".html'),\n" +
      "    customCss: Now.include('" + slug + ".scss'),\n" +
      (parts.link ? "    linkScript: Now.include('" + slug + ".link.js'),\n" : '') +
      "})\n";
    if (parts.link) { files['src/fluent/widgets/' + slug + '.link.js'] = parts.link; }
    files['src/fluent/widgets/' + slug + '.now.ts'] = widgetTs;

    /* ---- 2. Angular providers: typed SPAngularProvider, each script an external file ---- */
    var providerDecls = (parts.providers || []).map(function (p) {
      var pid = core.stableSysId(manifest.sysIdPrefix, p.name);
      keyRegistry.push({ key: p.name, table: 'sp_angular_provider', id: pid });
      files['src/fluent/providers/' + p.name + '.js'] = p.script;
      return "SPAngularProvider({\n" +
        "    $id: Now.ID[" + jsStr(p.name) + "],\n" +
        "    name: " + jsStr(p.name) + ",\n" +
        "    type: " + jsStr(p.type === 'directive' ? 'directive' : 'service') + ",\n" +
        "    script: Now.include(" + jsStr(p.name + '.js') + "),\n" +
        "})";
    });
    // Dev-harness-only stubs (e.g. Glide Studio's DeployModalService) - a controller still injects
    // them in the deployed widget behind an ng-if it never satisfies, so the injector needs a real
    // registration to resolve. Ship an empty factory, same intent as the XML stub.
    (manifest.stubProviders || []).forEach(function (name) {
      var sid = core.stableSysId(manifest.sysIdPrefix, name);
      keyRegistry.push({ key: name, table: 'sp_angular_provider', id: sid });
      files['src/fluent/providers/' + name + '.js'] = '[function () {\n  /* Dev-harness-only stub - the real ' + name + ' ships only in the dev harness. */\n  return {};\n}]';
      providerDecls.push("SPAngularProvider({\n" +
        "    $id: Now.ID[" + jsStr(name) + "],\n" +
        "    name: " + jsStr(name) + ",\n" +
        "    type: 'service',\n" +
        "    script: Now.include(" + jsStr(name + '.js') + "),\n" +
        "})");
    });
    if (providerDecls.length) {
      files['src/fluent/providers/' + slug + '.providers.now.ts'] =
        "import { SPAngularProvider } from '@servicenow/sdk/core'\n\n" + providerDecls.join('\n\n') + "\n";
    }

    /* ---- 3. page tree (generic Record, exactly like the official sample) ---- */
    var pageId = manifest.scope + '_page';
    var pageRecs = [
      record('page', 'sp_page', ids.page, {
        category: 'custom', id: pageId, internal: false,
        title: manifest.appName, short_description: manifest.appName + ' page',
        roles: (manifest.features && manifest.features.roles) ? ids.userRole : '',
      }),
      record('container', 'sp_container', ids.container, {
        name: manifest.appName, order: '100', sp_page: ids.page, width: 'container-fluid', bootstrap_alt: 'false',
      }),
      record('row', 'sp_row', ids.row, { order: '100', sp_container: ids.container }),
      record('column', 'sp_column', ids.column, { order: '100', size: '12', sp_row: ids.row }),
      record('instance', 'sp_instance', ids.instance, {
        order: 100, sp_column: ids.column, sp_widget: ids.widget, title: manifest.appName,
      }),
    ];
    files['src/fluent/page/' + slug + '.page.now.ts'] =
      "import { Record } from '@servicenow/sdk/core'\n\n" + pageRecs.join('\n\n') + "\n";

    /* ---- 4. theme + portal (generic Record) ---- */
    var portalRecs = [
      record('theme', 'sp_theme', ids.theme, { name: manifest.appName + ' Theme', navbar_fixed: true }),
      record('portal', 'sp_portal', ids.portal, {
        title: manifest.appName, url_suffix: manifest.urlSuffix,
        homepage: ids.page, theme: ids.theme, 'default': false,
      }),
    ];
    files['src/fluent/portal/' + slug + '.portal.now.ts'] =
      "import { Record } from '@servicenow/sdk/core'\n\n" + portalRecs.join('\n\n') + "\n";

    /* ---- 5. optional roles / groups / ACL layer (generic Record) ---- */
    if (manifest.features && manifest.features.roles) {
      files['src/fluent/roles/' + slug + '.roles.now.ts'] =
        "import { Record } from '@servicenow/sdk/core'\n\n" + buildRolesRecords(manifest, ids, record).join('\n\n') + "\n";
    }

    /* ---- 6. project scaffolding (full-project mode only) ---- */
    if (mode === 'project') {
      files['src/fluent/generated/keys.ts'] = renderKeys(keyRegistry);
      files['now.config.json'] = JSON.stringify({
        scope: manifest.scope, scopeId: ids.app, name: manifest.appName,
      }, null, 4) + '\n';
      var ver = opts.sdkVersion || 'latest';
      files['package.json'] = JSON.stringify({
        name: slug, version: manifest.version || '1.0.0', description: manifest.shortDescription || manifest.appName,
        license: 'UNLICENSED',
        scripts: { build: 'now-sdk build', deploy: 'now-sdk install', transform: 'now-sdk transform', types: 'now-sdk dependencies' },
        devDependencies: { '@servicenow/sdk': ver, '@servicenow/glide': ver },
      }, null, 4) + '\n';
      files['.gitignore'] = ['node_modules/', '.now/', 'dist/', '*.log'].join('\n') + '\n';
      files['README.md'] = renderReadme(manifest, slug);
    }

    return files;
  }

  // The roles/groups/ACL layer as generic Records - mirrors snpackager.core.js's buildRolesLayer
  // field-for-field (there is no typed Fluent Role/Group/ACL path we rely on here; generic Record
  // is guaranteed-correct and matches how the sample handles untyped tables).
  function buildRolesRecords(manifest, ids, record) {
    var r = manifest.roles;
    var recs = [
      record('user_role', 'sys_user_role', ids.userRole, {
        name: r.userRoleName, active: true,
        description: r.userRoleDescription || ('Can view and use the ' + manifest.appName + ' tool.'),
      }),
      record('admin_role', 'sys_user_role', ids.adminRole, {
        name: r.adminRoleName, active: true,
        description: r.adminRoleDescription || ("Can edit " + manifest.appName + "'s own application records (widget, page, theme, layout)."),
      }),
      record('user_group', 'sys_user_group', ids.userGroup, {
        name: r.userGroupName, active: true,
        description: r.userGroupDescription || ('Members can view and use the ' + manifest.appName + ' tool.'),
      }),
      record('admin_group', 'sys_user_group', ids.adminGroup, {
        name: r.adminGroupName, active: true,
        description: r.adminGroupDescription || ('Members can edit the ' + manifest.appName + ' application.'),
      }),
      record('user_group_role', 'sys_group_has_role', ids.userGroupRole, { group: ids.userGroup, role: ids.userRole }),
      record('admin_group_role', 'sys_group_has_role', ids.adminGroupRole, { group: ids.adminGroup, role: ids.adminRole }),
    ];
    core.ACL_TABLES.forEach(function (t) {
      var aclId = core.stableSysId(manifest.sysIdPrefix, t + ':acl');
      var aclRoleId = core.stableSysId(manifest.sysIdPrefix, t + ':acl_role');
      recs.push(record('acl_' + t, 'sys_security_acl', aclId, {
        name: t, operation: 'write', type: 'record', active: true, admin_overrides: false,
        condition: 'sys_scope=' + ids.app,
        description: 'Lets ' + r.adminRoleName + ' edit ' + t + ' records that belong to this application.',
      }));
      recs.push(record('acl_role_' + t, 'sys_security_acl_role', aclRoleId, {
        sys_security_acl: aclId, sys_user_role: ids.adminRole,
      }));
    });
    return recs;
  }

  // generated/keys.ts - pins every Now.ID key to its {table, id}, so references (which carry the
  // concrete sys_id) resolve and the typed $id lookups typecheck. Mirrors the sample's shape.
  function renderKeys(registry) {
    var entries = registry.map(function (e) {
      return "                    " + JSON.stringify(e.key) + ": {\n" +
        "                        table: " + JSON.stringify(e.table) + "\n" +
        "                        id: " + JSON.stringify(e.id) + "\n" +
        "                    }";
    });
    return "import '@servicenow/sdk/global'\n\n" +
      "declare global {\n" +
      "    namespace Now {\n" +
      "        namespace Internal {\n" +
      "            interface Keys extends KeysRegistry {\n" +
      "                explicit: {\n" +
      entries.join('\n') + "\n" +
      "                }\n" +
      "            }\n" +
      "        }\n" +
      "    }\n" +
      "}\n";
  }

  function renderReadme(manifest, slug) {
    return '# ' + manifest.appName + ' — ServiceNow Fluent (Now SDK) package\n\n' +
      'Generated by the packager\'s deploy console. This is a ServiceNow Now SDK project: the app\'s\n' +
      'widget, Angular providers, page, portal, and theme declared as metadata-as-code.\n\n' +
      '## Build & install\n\n' +
      '```bash\n' +
      'npm install\n' +
      'npm run build      # now-sdk build\n' +
      'npm run deploy     # now-sdk install — pushes to the instance you auth against\n' +
      '```\n\n' +
      'See https://servicenow.github.io/sdk/ for authenticating the SDK to your instance.\n\n' +
      '## Layout\n\n' +
      '- `src/fluent/widgets/` — the `SPWidget` and its template/css/client/server files\n' +
      '- `src/fluent/providers/` — each shared `SPAngularProvider` (injected by name at runtime)\n' +
      '- `src/fluent/page/` — the page/container/row/column/instance layout\n' +
      '- `src/fluent/portal/` — the portal + theme\n' +
      '- `src/fluent/generated/keys.ts` — stable record identity (shares sys_ids with the Update Set XML build)\n';
  }

  return { assembleFluent: assembleFluent };
});
