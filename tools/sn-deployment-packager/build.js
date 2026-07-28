#!/usr/bin/env node
/* Generic Node build CLI - works for ANY app with a deploy.manifest.js (see manifest.schema.md).
   Reads the manifest, loads sources from disk, runs buildParts()/assembleFluent(), and writes the
   Now SDK project into apps/<app>/deploy/fluent/.

   Usage:
     node tools/sn-deployment-packager/build.js <app-folder> [--fluent-mode=project|files]
       [--scope=...] [--app-name=...] [--version=...]

   Output (under apps/<app-folder>/deploy/):
     fluent/**                 Now SDK project (or src/fluent/** only in files mode)
     <app-folder>-fluent.zip   project mode only
*/
'use strict';

var fs = require('fs');
var path = require('path');
var core = require('./core.js');
var fluent = require('./fluent.js');
var zipper = require('./zip.js');

var ROOT = path.join(__dirname, '..', '..');

function parseArgs(argv) {
  var appFolder = null;
  var fluentMode = 'project';
  var scope = null;
  var appName = null;
  var version = null;
  argv.forEach(function (arg) {
    if (arg.indexOf('--format=') === 0) {
      var fmt = arg.slice('--format='.length);
      if (fmt !== 'fluent') {
        throw new Error('XML export was removed - only Fluent/SDK builds are supported (got --format=' + fmt + ').');
      }
    } else if (arg.indexOf('--fluent-mode=') === 0) { fluentMode = arg.slice('--fluent-mode='.length); }
    else if (arg.indexOf('--scope=') === 0) { scope = arg.slice('--scope='.length); }
    else if (arg.indexOf('--app-name=') === 0) { appName = arg.slice('--app-name='.length); }
    else if (arg.indexOf('--version=') === 0) { version = arg.slice('--version='.length); }
    else if (arg.indexOf('--') !== 0) { appFolder = arg; }
  });
  return {
    appFolder: appFolder, fluentMode: fluentMode,
    scope: scope, appName: appName, version: version,
  };
}

function loadDescriptor(appFolder) {
  var manifestFile = path.join(ROOT, 'apps', appFolder, 'deploy.manifest.js');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(appFolder + ' has no deploy.manifest.js - not deployable (see manifest.schema.md).');
  }
  var descriptor = require(manifestFile);
  if (descriptor.deployable === false) {
    throw new Error(appFolder + ' has deployable: false in deploy.manifest.js - not offered by the packager.');
  }
  return descriptor;
}

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

function buildFluent(appRoot, descriptor, parts, fluentMode) {
  var files = fluent.assembleFluent(descriptor.manifest, parts, {
    mode: fluentMode,
    sdkVersion: descriptor.deployOptions && descriptor.deployOptions.fluent && descriptor.deployOptions.fluent.sdkVersion,
  });
  var fluentDir = path.join(appRoot, 'deploy', 'fluent');
  if (fs.existsSync(fluentDir)) {
    fs.readdirSync(fluentDir).forEach(function (name) {
      if (name === 'node_modules' || name === 'package-lock.json' || name === '.now') { return; }
      fs.rmSync(path.join(fluentDir, name), { recursive: true, force: true });
    });
  }
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
    console.error('Usage: node tools/sn-deployment-packager/build.js <app-folder> [--fluent-mode=project|files] [--scope=...] [--app-name=...] [--version=...]');
    process.exit(1);
  }
  if (['project', 'files'].indexOf(args.fluentMode) === -1) { throw new Error('--fluent-mode must be project or files'); }

  var appRoot = path.join(ROOT, 'apps', args.appFolder);
  var descriptor = loadDescriptor(args.appFolder);
  if (args.appName) { descriptor.manifest.appName = args.appName; }
  if (args.version) { descriptor.manifest.version = args.version; }
  if (args.scope) {
    descriptor.manifest.scope = args.scope;
    delete descriptor.manifest.vendorPrefix;
  }
  var sources = loadSources(appRoot, descriptor);
  var parts = core.buildParts(descriptor.manifest, sources, {});

  console.log('Building ' + descriptor.manifest.appName + ' (' + args.appFolder + ')…');
  if (args.scope) { console.log('  Scope:  ' + args.scope + ' (override)'); }
  buildFluent(appRoot, descriptor, parts, args.fluentMode);
}

main();
