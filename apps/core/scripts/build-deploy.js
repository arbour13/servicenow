/* Packages Core as a ServiceNow scoped application Update Set, via the shared packaging
   core at ServiceNow/tools/sn-deployment-packager/core.js (source of truth: see that file's header
   comment and manifest.schema.md alongside it). The manifest itself lives in ../deploy.manifest.js
   (this app's ONE descriptor - also read by the shared deploy console), not duplicated here.

   node scripts/build-deploy.js
       Writes deploy/core-update-set.xml. */
'use strict';

var fs = require('fs');
var path = require('path');
var core = require('../../../tools/sn-deployment-packager/core.js');
var descriptor = require('../deploy.manifest.js');

var ROOT = path.join(__dirname, '..');
var OUT_FILE = path.join(ROOT, 'deploy', 'core-update-set.xml');

var MANIFEST = descriptor.manifest;

function main() {
  var providerSrcs = {};
  MANIFEST.providers.forEach(function (p) {
    providerSrcs[p.file] = fs.readFileSync(path.join(ROOT, p.file), 'utf8');
  });
  var sources = {
    controllerSrc: fs.readFileSync(path.join(ROOT, descriptor.files.controller), 'utf8'),
    scssSrc: fs.readFileSync(path.join(ROOT, descriptor.files.scss), 'utf8'),
    sharedScss: (descriptor.sharedScssPartials || [])
      .map(function (f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }).join('\n'),
    indexHtml: fs.readFileSync(path.join(ROOT, descriptor.files.index), 'utf8'),
    providerSrcs: providerSrcs,
    serverScript: descriptor.serverScriptSource,
  };

  var parts = core.buildParts(MANIFEST, sources);
  var xml = core.assembleXml(MANIFEST, parts, { stamp: MANIFEST.version + ' build' });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, xml);

  var ids = core.deriveSysIds(MANIFEST);
  var allSysIds = Object.keys(ids).map(function (k) { return ids[k]; })
    .concat(MANIFEST.providers.map(function (p) { return core.stableSysId(MANIFEST.sysIdPrefix, p.name); }));
  var dupes = allSysIds.filter(function (id, i) { return allSysIds.indexOf(id) !== i; });
  if (dupes.length) { throw new Error('Duplicate sys_id(s) generated: ' + dupes.join(', ')); }
  console.log('Wrote ' + path.relative(ROOT, OUT_FILE) + ' - ' + allSysIds.length + ' unique sys_ids, ' + MANIFEST.providers.length + ' shared providers, scope ' + MANIFEST.scope);
}

main();
