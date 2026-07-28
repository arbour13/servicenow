/* Fluent (ServiceNow Now SDK) serializer for the SN Deployment Packager.
   assembleFluent() emits a whole Now SDK TypeScript PROJECT as a file-map ({ 'relative/path':
   'contents' }). Pure and I/O-free, same as the core - it takes the already-extracted `parts`
   (from core.buildParts) plus the manifest, and returns data. No fetch, no fs, no zip here.
   The deploy console previews the map and installs via sdk-bridge; the Node CLI may also zip it.

   Walks the SAME shared record model (core.buildRecordModel) - see that
   function's doc comment in core.js for the field shape. This file's only job is
   deciding HOW to render each record as Fluent: `sp_widget`/`sp_angular_provider` use Fluent's
   TYPED APIs (SPWidget/SPAngularProvider from '@servicenow/sdk/core'), with every `cdata`-flagged
   field becoming an external file pulled in via Now.include(); everything else has no typed Fluent
   API, so it's emitted via the GENERIC Record({ $id, table, data }) API, exactly as
   ServiceNow/sdk-examples' service-portal-sample does for its own page tree and portal (verified
   2026-07). `xmlOnly`/`scopeTag`/`empty`-flagged fields are XML-only bookkeeping and are skipped
   here - Fluent identity comes from Now.ID + generated/keys.ts instead. The `sys_app` record has
   no Fluent Record() equivalent at all (an app's identity is its now.config.json, not metadata),
   so it's skipped entirely - its sys_id still becomes now.config.json's scopeId.

   IDENTITY: every record's sys_id comes from the model's core.deriveSysIds()/stableSysId() (the
   SAME ids the XML path uses), so a Fluent-installed app and an XML-installed app are the same
   records - re-importing one over the other updates in place instead of duplicating.

   controllerAs comes from the shared record model's controller_as field (manifest.controllerAs,
   default 'vm'). Widgets that inject Angular providers list them on SPWidget.angularProviders so
   Service Portal creates the widget↔provider m2m and the controller's DI can resolve them. (XML
   historically omitted that m2m and relied on global injector coincidence - that fails for
   Fluent/scoped installs, which is why {{c.*}} bindings show unbound when providers are missing.) */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./core.js'));
  } else {
    root.SNDeploymentPackager = root.SNDeploymentPackager || {};
    root.SNDeploymentPackager.fluent = factory(root.SNDeploymentPackager.core);
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

  function fieldValue(rec, name) {
    for (var i = 0; i < rec.fields.length; i++) { if (rec.fields[i].name === name) { return rec.fields[i].value; } }
    return undefined;
  }

  // Fluent Record() data is typed (SDK 4.9+ table schemas). The shared record model stores many
  // values as XML-friendly strings ('false', '1', ''); coerce here so .now.ts typechecks. XML
  // assembly still uses the raw model unchanged.
  function coerceFluentValue(name, value) {
    if (value === '' && (name === 'roles' || name === 'role')) { return undefined; }
    if (name === 'roles' && typeof value === 'string' && value) {
      return value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (name === 'bootstrap_alt' || name === 'internal' || name === 'active' || name === 'public') {
      if (value === 'true' || value === true) { return true; }
      if (value === 'false' || value === false) { return false; }
    }
    if ((name === 'order' || name === 'size') && typeof value === 'string' && /^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    return value;
  }

  // The "real" fields a generic Record() carries - everything except XML-only bookkeeping
  // (sys_id/sys_name/sys_scope/sys_update_name/sys_class_name via `xmlOnly`/`scopeTag`) and the
  // self-closing `empty` tags (sp_widget-only, handled by the typed-widget branch instead).
  function businessData(rec) {
    var data = {};
    rec.fields.forEach(function (f) {
      if (f.xmlOnly || f.scopeTag || f.empty) { return; }
      var v = coerceFluentValue(f.name, f.value);
      if (v === undefined) { return; }
      data[f.name] = v;
    });
    return data;
  }

  // Renders a generic Record({ $id, table, data }) block. `data` is a plain object of SHORT scalar
  // fields (strings/bools/numbers) - long content (scripts/templates/css) never goes here, it goes
  // to external files referenced from the typed SPWidget/SPAngularProvider instead.
  function renderRecord(key, table, data) {
    var lines = Object.keys(data).map(function (f) {
      var v = data[f];
      var rendered;
      if (typeof v === 'boolean' || typeof v === 'number') { rendered = String(v); }
      else if (Array.isArray(v)) {
        rendered = '[' + v.map(function (item) {
          return typeof item === 'string' ? jsStr(item) : String(item);
        }).join(', ') + ']';
      } else { rendered = jsStr(v); }
      return '        ' + f + ': ' + rendered + ',';
    });
    return "Record({\n    $id: Now.ID[" + jsStr(key) + "],\n    table: " + jsStr(table) +
      ",\n    data: {\n" + lines.join('\n') + "\n    },\n})";
  }

  // Which generated file a generic-Record table's declaration lands in - purely a file-layout
  // grouping (readability), not a Fluent requirement. Anything not listed here (the roles/groups/
  // ACL tables) falls into the roles file.
  var PAGE_TABLES = { sp_page: 1, sp_container: 1, sp_row: 1, sp_column: 1, sp_instance: 1 };
  var PORTAL_TABLES = { sp_theme: 1, sp_portal: 1 };

  // Emit one Fluent Table() file per model.tables entry. schema is an object of typed Columns
  // (SDK Table API), not a flat Record().
  function renderColumnCall(col) {
    var props = [];
    if (col.label) { props.push('label: ' + jsStr(col.label)); }
    if (col.mandatory) { props.push('mandatory: true'); }
    if (col.maxLength != null) { props.push('maxLength: ' + Number(col.maxLength)); }
    if (col.type === 'choice' && col.choices) {
      var choicesObj = normalizeChoices(col.choices);
      var choiceLines = Object.keys(choicesObj).map(function (k) {
        return '            ' + JSON.stringify(k) + ': ' + jsStr(choicesObj[k]) + ',';
      });
      props.push('choices: {\n' + choiceLines.join('\n') + '\n        }');
    }
    if (col.type === 'reference') {
      props.push('referenceTable: ' + jsStr(col.referenceTable));
      if (col.cascadeRule) { props.push('cascadeRule: ' + jsStr(col.cascadeRule)); }
    }
    var ctor = {
      choice: 'ChoiceColumn',
      reference: 'ReferenceColumn',
      string: 'StringColumn',
      integer: 'IntegerColumn',
      json: 'JsonColumn',
    }[col.type] || 'StringColumn';
    return ctor + '({\n            ' + props.join(',\n            ') + ',\n        })';
  }

  function normalizeChoices(choices) {
    var out = {};
    if (Array.isArray(choices)) {
      choices.forEach(function (c) {
        if (typeof c === 'string') {
          out[c] = c.replace(/_/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
        } else if (c && c.value != null) {
          out[c.value] = c.label || String(c.value);
        }
      });
      return out;
    }
    if (choices && typeof choices === 'object') {
      Object.keys(choices).forEach(function (k) {
        var v = choices[k];
        out[k] = (v && typeof v === 'object' && v.label) ? v.label : String(v);
      });
    }
    return out;
  }

  function renderTableFile(table) {
    var colTypes = {};
    table.columns.forEach(function (c) {
      var ctor = {
        choice: 'ChoiceColumn',
        reference: 'ReferenceColumn',
        string: 'StringColumn',
        integer: 'IntegerColumn',
        json: 'JsonColumn',
      }[c.type] || 'StringColumn';
      colTypes[ctor] = true;
    });
    var imports = ['Table'].concat(Object.keys(colTypes)).join(', ');
    var schemaLines = table.columns.map(function (c) {
      return '        ' + c.name + ': ' + renderColumnCall(c) + ',';
    });
    // Export const name must be a valid identifier matching the table name (SDK requirement).
    var exportName = table.name.replace(/[^a-zA-Z0-9_]/g, '_');
    return "import { " + imports + " } from '@servicenow/sdk/core'\n\n" +
      'export const ' + exportName + ' = Table({\n' +
      '    name: ' + jsStr(table.name) + ',\n' +
      '    label: ' + jsStr(table.label) + ',\n' +
      '    schema: {\n' +
      schemaLines.join('\n') + '\n' +
      '    },\n' +
      '})\n';
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
    var slug = slugify(manifest.appName);
    var model = core.buildRecordModel(manifest, parts);
    var files = {};
    var keyRegistry = []; // { key, table, id } - drives generated/keys.ts
    var providerDecls = []; // { name, decl } - exported consts the widget imports
    var pageRecs = [];
    var portalRecs = [];
    var roleRecs = [];
    var widgetRec = null;

    (model.tables || []).forEach(function (t) {
      files['src/fluent/tables/' + t.shortName + '.now.ts'] = renderTableFile(t);
    });

    model.records.forEach(function (rec) {
      if (rec.table === 'sys_app') { return; } // identity lives in now.config.json, not a Record
      keyRegistry.push({ key: rec.key, table: rec.table, id: rec.sysId });

      if (rec.table === 'sp_widget') {
        widgetRec = rec;
        return;
      }

      if (rec.table === 'sp_angular_provider') {
        var pname = fieldValue(rec, 'name');
        var ptype = fieldValue(rec, 'type');
        files['src/fluent/providers/' + pname + '.js'] = fieldValue(rec, 'script');
        providerDecls.push({
          name: pname,
          decl:
            'export const ' + pname + ' = SPAngularProvider({\n' +
            "    $id: Now.ID[" + jsStr(pname) + "],\n" +
            "    name: " + jsStr(pname) + ",\n" +
            "    type: " + jsStr(ptype === 'directive' ? 'directive' : 'service') + ",\n" +
            "    script: Now.include(" + jsStr(pname + '.js') + "),\n" +
            "})",
        });
        return;
      }

      // Everything else has no typed Fluent API - generic Record(), grouped into a file by table.
      var rendered = renderRecord(rec.key, rec.table, businessData(rec));
      if (PAGE_TABLES[rec.table]) { pageRecs.push(rendered); }
      else if (PORTAL_TABLES[rec.table]) { portalRecs.push(rendered); }
      else { roleRecs.push(rendered); } // sys_user_role/sys_user_group/sys_group_has_role/sys_security_acl*
    });

    if (widgetRec) {
      var rec = widgetRec;
      files['src/fluent/widgets/' + slug + '.client.js'] = fieldValue(rec, 'client_script');
      files['src/fluent/widgets/' + slug + '.html'] = fieldValue(rec, 'template');
      files['src/fluent/widgets/' + slug + '.scss'] = fieldValue(rec, 'css');
      files['src/fluent/widgets/' + slug + '.server.js'] = fieldValue(rec, 'script');
      var link = fieldValue(rec, 'link');
      var importLines = ["import { SPWidget } from '@servicenow/sdk/core'"];
      if (providerDecls.length) {
        importLines.push(
          'import { ' + providerDecls.map(function (p) { return p.name; }).join(', ') +
          " } from '../providers/" + slug + ".providers.now'"
        );
      }
      var lines = importLines.concat([
        '',
        'SPWidget({',
        "    $id: Now.ID['widget'],",
        '    name: ' + jsStr(fieldValue(rec, 'name')) + ',',
        '    id: ' + jsStr(fieldValue(rec, 'id')) + ',',
        '    description: ' + jsStr(fieldValue(rec, 'description')) + ',',
        '    controllerAs: ' + jsStr(fieldValue(rec, 'controller_as') || 'vm') + ',',
        '    hasPreview: true,',
        "    category: 'custom',",
        "    clientScript: Now.include('" + slug + ".client.js'),",
        "    serverScript: Now.include('" + slug + ".server.js'),",
        "    htmlTemplate: Now.include('" + slug + ".html'),",
        "    customCss: Now.include('" + slug + ".scss'),",
      ]);
      if (providerDecls.length) {
        lines.push('    angularProviders: [' + providerDecls.map(function (p) { return p.name; }).join(', ') + '],');
      }
      if (link) {
        files['src/fluent/widgets/' + slug + '.link.js'] = link;
        lines.push("    linkScript: Now.include('" + slug + ".link.js'),");
      }
      lines.push('})', '');
      files['src/fluent/widgets/' + slug + '.now.ts'] = lines.join('\n');
    }

    if (providerDecls.length) {
      files['src/fluent/providers/' + slug + '.providers.now.ts'] =
        "import { SPAngularProvider } from '@servicenow/sdk/core'\n\n" +
        providerDecls.map(function (p) { return p.decl; }).join('\n\n') + "\n";
    }
    files['src/fluent/page/' + slug + '.page.now.ts'] =
      "import { Record } from '@servicenow/sdk/core'\n\n" + pageRecs.join('\n\n') + "\n";
    if (portalRecs.length) {
      files['src/fluent/portal/' + slug + '.portal.now.ts'] =
        "import { Record } from '@servicenow/sdk/core'\n\n" + portalRecs.join('\n\n') + "\n";
    }
    if (roleRecs.length) {
      files['src/fluent/roles/' + slug + '.roles.now.ts'] =
        "import { Record } from '@servicenow/sdk/core'\n\n" + roleRecs.join('\n\n') + "\n";
    }

    if (mode === 'project') {
      files['src/fluent/generated/keys.ts'] = renderKeys(keyRegistry);
      files['now.config.json'] = JSON.stringify({
        scope: manifest.scope, scopeId: model.ids.app, name: manifest.appName,
      }, null, 4) + '\n';
      var ver = opts.sdkVersion || 'latest';
      files['package.json'] = JSON.stringify({
        name: slug, version: manifest.version || '1.0.0', description: manifest.shortDescription || manifest.appName,
        license: 'UNLICENSED',
        scripts: { build: 'now-sdk build', deploy: 'now-sdk install', transform: 'now-sdk transform', types: 'now-sdk dependencies' },
        devDependencies: { '@servicenow/sdk': ver, '@servicenow/glide': ver },
      }, null, 4) + '\n';
      files['.gitignore'] = ['node_modules/', '.now/', 'dist/', '*.log'].join('\n') + '\n';
      files['README.md'] = renderReadme(manifest, slug, model.tables || []);
    }

    return files;
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

  function renderReadme(manifest, slug, tables) {
    var hasPortal = !(manifest.features && (manifest.features.portal === false || manifest.features.theme === false));
    var tableLines = (tables && tables.length)
      ? '- `src/fluent/tables/` - Fluent `Table()` definitions (' +
        tables.map(function (t) { return t.name; }).join(', ') + ')\n'
      : '';
    return '# ' + manifest.appName + ' - Fluent (Now SDK) project\n\n' +
      'Generated by the SN Deployment Packager. **These are the files the Now SDK needs to deploy this app.**\n' +
      'The zip is a full ServiceNow Now SDK project: Service Portal widget, Angular providers, page' +
      (hasPortal ? ', portal, and theme' : '') +
      ' as metadata-as-code. Reinstalls update the same records via stable sys_ids.\n\n' +
      '## Prerequisites\n\n' +
      '- Node.js + npm\n' +
      '- Access to a ServiceNow instance that supports the Now SDK / Fluent deploy path\n' +
      '- The Now SDK CLI authenticated to that instance ' +
      '(see https://servicenow.github.io/sdk/ )\n\n' +
      '## Install & deploy\n\n' +
      '```bash\n' +
      'npm install\n' +
      'npm run build      # now-sdk build\n' +
      'npm run deploy     # now-sdk install - pushes to the authenticated instance\n' +
      '```\n\n' +
      'If the SDK is not authenticated yet, follow the SDK docs to log in before `npm run deploy`.\n\n' +
      '## Layout\n\n' +
      '- `package.json` / `now.config.json` - Now SDK project shell and scope id\n' +
      '- `src/fluent/widgets/` - `SPWidget` plus template/css/client/server files\n' +
      '- `src/fluent/providers/` - each `SPAngularProvider` (injected by name at runtime)\n' +
      '- `src/fluent/page/` - page / container / row / column / instance layout\n' +
      (hasPortal ? '- `src/fluent/portal/` - portal + theme\n' : '') +
      tableLines +
      '- `src/fluent/generated/keys.ts` - stable record identity\n' +
      '- `README.md` - this file\n';
  }

  return { assembleFluent: assembleFluent };
});
