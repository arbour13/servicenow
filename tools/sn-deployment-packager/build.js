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

function resolveContentModelParts(appRoot, files) {
  var contentModel = files.contentModel;
  if (!contentModel) {
    return [];
  }
  var paths = Array.isArray(contentModel) ? contentModel : [contentModel];
  return paths.map(function (rel) {
    return fs.readFileSync(path.join(appRoot, rel), 'utf8');
  });
}

function resolveServerScript(appRoot, descriptor) {
  var files = descriptor.files || {};
  if (files.serverScript) {
    var parts = resolveContentModelParts(appRoot, files);
    parts.push(fs.readFileSync(path.join(appRoot, files.serverScript), 'utf8'));
    return parts.join('\n');
  }
  return descriptor.serverScriptSource;
}

function loadSources(appRoot, descriptor) {
  var providerSrcs = {};
  (descriptor.manifest.providers || []).forEach(function (p) {
    if (p.deploy === false) { return; }
    providerSrcs[p.file] = fs.readFileSync(path.join(appRoot, p.file), 'utf8');
  });
  var sharedScss = (descriptor.sharedScssPartials || [])
    .map(function (f) { return fs.readFileSync(path.join(appRoot, f), 'utf8'); }).join('\n');
  var viewPartials = {};
  var viewPartialFiles = (descriptor.files && descriptor.files.viewPartials) || {};
  Object.keys(viewPartialFiles).forEach(function (name) {
    viewPartials[name] = fs.readFileSync(path.join(appRoot, viewPartialFiles[name]), 'utf8');
  });
  var sources = {
    scssSrc: fs.readFileSync(path.join(appRoot, descriptor.files.scss), 'utf8'),
    sharedScss: sharedScss,
    indexHtml: fs.readFileSync(path.join(appRoot, descriptor.files.index), 'utf8'),
    viewPartials: viewPartials,
    providerSrcs: providerSrcs,
    serverScript: resolveServerScript(appRoot, descriptor),
  };

  var widgetDefs = descriptor.manifest.widgets;
  if (Array.isArray(widgetDefs) && widgetDefs.length) {
    // Multi-widget: one controller file per widget, plus a template fragment for widgets that
    // declare templatePartial/templateFile - see manifest.schema.md's widgets[] doc. A widget with
    // neither (the shell) has no templateTexts entry; buildParts falls back to indexHtml for it.
    var controllerSrcs = {};
    var templateTexts = {};
    widgetDefs.forEach(function (w) {
      controllerSrcs[w.id] = fs.readFileSync(path.join(appRoot, w.controller), 'utf8');
      if (w.templatePartial) {
        templateTexts[w.id] = fs.readFileSync(path.join(appRoot, w.templatePartial), 'utf8');
      } else if (w.templateFile) {
        templateTexts[w.id] = fs.readFileSync(path.join(appRoot, w.templateFile), 'utf8');
      }
    });
    sources.widgets = { controllerSrcs: controllerSrcs, templateTexts: templateTexts };
  } else {
    sources.controllerSrc = fs.readFileSync(path.join(appRoot, descriptor.files.controller), 'utf8');
  }

  return sources;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function buildFluent(appRoot, descriptor, parts, fluentMode) {
  var fluentDir = path.join(appRoot, 'deploy', 'fluent');
  // Read keys.ts BEFORE wiping deploy/fluent so composite m2m / dictionary ids survive rebuilds.
  var priorKeysPath = path.join(fluentDir, 'src', 'fluent', 'generated', 'keys.ts');
  var priorKeysText = null;
  if (fs.existsSync(priorKeysPath)) {
    priorKeysText = fs.readFileSync(priorKeysPath, 'utf8');
  }
  var files = fluent.assembleFluent(descriptor.manifest, parts, {
    mode: fluentMode,
    sdkVersion: descriptor.deployOptions && descriptor.deployOptions.fluent && descriptor.deployOptions.fluent.sdkVersion,
    priorKeysText: priorKeysText,
  });
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
  if (!descriptor.manifest.scope) {
    throw new Error(
      'No scope set for ' + args.appFolder + '. Pass --scope=<full-scope> ' +
      '(connection apps omit a hardcoded scope from deploy.manifest.js).'
    );
  }
  var sources = loadSources(appRoot, descriptor);
  var parts = core.buildParts(descriptor.manifest, sources, {});

  console.log('Building ' + descriptor.manifest.appName + ' (' + args.appFolder + ')…');
  console.log('  Scope:  ' + descriptor.manifest.scope + (args.scope ? ' (override)' : ''));
  buildFluent(appRoot, descriptor, parts, args.fluentMode);
}

main();
