#!/usr/bin/env node
/* Generic Node build CLI - works for ANY app with a deploy.manifest.js (see manifest.schema.md),
   not just the two that happen to have their own build-deploy.js today. Reads the manifest,
   fetches every source file off disk, runs the same buildParts()/assembleXml()/assembleFluent()
   pipeline the browser deploy console uses, and writes the result into that app's own
   apps/<app>/deploy/ folder - so a build is just a file on disk, checked into git like anything
   else, instead of only ever existing as a browser download.

   Usage:
     node tools/packager/build.js <app-folder> [--format=xml|fluent|both] [--fluent-mode=project|files]

   Examples:
     node tools/packager/build.js core
     node tools/packager/build.js glide-studio --format=fluent
     node tools/packager/build.js standards --format=both --fluent-mode=files

   Output (all under apps/<app-folder>/deploy/):
     <app-folder>-update-set.xml         (--format=xml or both)
     fluent/**                           (--format=fluent or both; the generated Now SDK project)
     <app-folder>-fluent.zip             (--format=fluent or both, project mode only)

   Any app without a deploy.manifest.js is simply not eligible - same rule the deploy console
   applies (see manifest.schema.md's "deploy.manifest.js" section). This is a build-time script;
   it never runs inside a deployed widget. */
'use strict';

var fs = require('fs');
var path = require('path');
var core = require('./snpackager.core.js');
var fluent = require('./snpackager.fluent.js');
var zipper = require('./snpackager.zip.js');

var ROOT = path.join(__dirname, '..', '..'); // ServiceNow/ suite root

function parseArgs(argv) {
  var appFolder = null;
  var format = 'both';
  var fluentMode = 'project';
  argv.forEach(function (arg) {
    if (arg.indexOf('--format=') === 0) { format = arg.slice('--format='.length); }
    else if (arg.indexOf('--fluent-mode=') === 0) { fluentMode = arg.slice('--fluent-mode='.length); }
    else if (arg.indexOf('--') !== 0) { appFolder = arg; }
  });
  return { appFolder: appFolder, format: format, fluentMode: fluentMode };
}

function loadDescriptor(appFolder) {
  var manifestFile = path.join(ROOT, 'apps', appFolder, 'deploy.manifest.js');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(appFolder + ' has no deploy.manifest.js - not deployable (see manifest.schema.md).');
  }
  return require(manifestFile);
}

// Fetches every source file this app's manifest names, off disk - the Node-side mirror of what
// the browser deploy console does with fetch(). All paths are app-root-relative, per
// deploy.manifest.js's contract.
function loadSources(appRoot, descriptor) {
  var providerSrcs = {};
  (descriptor.manifest.providers || []).forEach(function (p) {
    providerSrcs[p.file] = fs.readFileSync(path.join(appRoot, p.file), 'utf8');
  });
  var sharedScss = (descriptor.sharedScssPartials || [])
    .map(function (f) { return fs.readFileSync(path.join(appRoot, f), 'utf8'); }).join('\n');
  return {
    controllerSrc: fs.readFileSync(path.join(appRoot, descriptor.files.controller), 'utf8'),
    scssSrc: fs.readFileSync(path.join(appRoot, descriptor.files.scss), 'utf8'),
    sharedScss: sharedScss,
    indexHtml: fs.readFileSync(path.join(appRoot, descriptor.files.index), 'utf8'),
    providerSrcs: providerSrcs,
    serverScript: descriptor.serverScriptSource,
  };
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function buildXml(appRoot, descriptor, parts) {
  var xml = core.assembleXml(descriptor.manifest, parts, { stamp: (descriptor.manifest.version || '1.0.0') + ' build' });
  var outFile = path.join(appRoot, 'deploy', path.basename(appRoot) + '-update-set.xml');
  // Never reuse an already-derived slug/filename from elsewhere - use the app's OWN folder name so
  // output is predictable regardless of what the app calls itself internally.
  writeFile(outFile, xml);

  var ids = core.deriveSysIds(descriptor.manifest);
  var allSysIds = Object.keys(ids).map(function (k) { return ids[k]; })
    .concat((descriptor.manifest.providers || []).map(function (p) { return core.stableSysId(descriptor.manifest.sysIdPrefix, p.name); }))
    .concat((descriptor.manifest.stubProviders || []).map(function (n) { return core.stableSysId(descriptor.manifest.sysIdPrefix, n); }));
  var dupes = allSysIds.filter(function (id, i) { return allSysIds.indexOf(id) !== i; });
  if (dupes.length) { throw new Error('Duplicate sys_id(s) generated: ' + dupes.join(', ')); }
  console.log('  XML:    ' + path.relative(ROOT, outFile) + ' (' + allSysIds.length + ' unique sys_ids, scope ' + descriptor.manifest.scope + ')');
}

function buildFluent(appRoot, descriptor, parts, fluentMode) {
  var files = fluent.assembleFluent(descriptor.manifest, parts, {
    mode: fluentMode,
    sdkVersion: descriptor.deployOptions && descriptor.deployOptions.fluent && descriptor.deployOptions.fluent.sdkVersion,
  });
  var fluentDir = path.join(appRoot, 'deploy', 'fluent');
  // Clean rebuild - a stale file from a previous manifest shape should not survive.
  fs.rmSync(fluentDir, { recursive: true, force: true });
  Object.keys(files).forEach(function (relPath) { writeFile(path.join(fluentDir, relPath), files[relPath]); });
  console.log('  Fluent: ' + path.relative(ROOT, fluentDir) + '/ (' + Object.keys(files).length + ' files, ' +
    (fluentMode === 'project' ? 'full Now SDK project' : 'src/fluent/** only') + ')');

  if (fluentMode === 'project') {
    var zipPath = path.join(appRoot, 'deploy', path.basename(appRoot) + '-fluent.zip');
    zipper.zip(files).arrayBuffer().then(function (buf) {
      writeFile(zipPath, Buffer.from(buf));
      console.log('  Zip:    ' + path.relative(ROOT, zipPath));
    });
  }
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  if (!args.appFolder) {
    console.error('Usage: node tools/packager/build.js <app-folder> [--format=xml|fluent|both] [--fluent-mode=project|files]');
    process.exit(1);
  }
  if (['xml', 'fluent', 'both'].indexOf(args.format) === -1) { throw new Error('--format must be xml, fluent, or both'); }
  if (['project', 'files'].indexOf(args.fluentMode) === -1) { throw new Error('--fluent-mode must be project or files'); }

  var appRoot = path.join(ROOT, 'apps', args.appFolder);
  var descriptor = loadDescriptor(args.appFolder);
  var sources = loadSources(appRoot, descriptor);
  var parts = core.buildParts(descriptor.manifest, sources, {});

  console.log('Building ' + descriptor.manifest.appName + ' (' + args.appFolder + ')…');
  if (args.format === 'xml' || args.format === 'both') { buildXml(appRoot, descriptor, parts); }
  if (args.format === 'fluent' || args.format === 'both') { buildFluent(appRoot, descriptor, parts, args.fluentMode); }
}

main();
