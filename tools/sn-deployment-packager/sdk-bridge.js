#!/usr/bin/env node
/* Localhost-only bridge so the browser deploy console can hand Connect credentials to the
   Now SDK (auth + Fluent install) and stream progress as NDJSON.

   Bind: 127.0.0.1:17345 only (never 0.0.0.0).
   Start: node "$(git rev-parse --show-toplevel)/tools/sn-deployment-packager/sdk-bridge.js"
   Endpoints:
     GET  /health
     GET  /fluent-sources?appFolder=...   prior Fluent sources for semver diff
     POST /auth    { instanceUrl, username, password, alias?, appFolder? }  → NDJSON stream
     POST /deploy  { appFolder, alias?, scope?, appName?, version? }        → NDJSON stream

   Passwords are never written to disk or logged. */
'use strict';

var http = require('http');
var { spawn } = require('child_process');
var fs = require('fs');
var path = require('path');
var semver = require('./semver.js');

var PORT = 17345;
var HOST = '127.0.0.1';
var ROOT = path.join(__dirname, '..', '..');

function corsHeaders(extra) {
  var h = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (extra) {
    Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
  }
  return h;
}

function sendJson(res, status, body) {
  var payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
  res.end(payload);
}

function beginNdjson(res) {
  res.writeHead(200, corsHeaders({
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  }));
  return function emit(evt) {
    res.write(JSON.stringify(evt) + '\n');
  };
}

function readJson(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function aliasFromUrl(instanceUrl) {
  try {
    var host = new URL(String(instanceUrl || '').trim()).hostname || '';
    var first = host.split('.')[0];
    return (first && /^[a-zA-Z0-9_-]+$/.test(first)) ? first : 'sn-instance';
  } catch (e) {
    return 'sn-instance';
  }
}

function normalizeInstanceUrl(url) {
  var u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) { throw new Error('instanceUrl is required'); }
  if (!/^https?:\/\//i.test(u)) { u = 'https://' + u; }
  return u;
}

function fluentDir(appFolder) {
  return path.join(ROOT, 'apps', appFolder, 'deploy', 'fluent');
}

function nowSdkBin(appFolder) {
  var local = path.join(fluentDir(appFolder), 'node_modules', '.bin', 'now-sdk');
  if (fs.existsSync(local)) { return local; }
  var candidates = ['delivery-methodology', 'glide-studio', 'standards'];
  for (var i = 0; i < candidates.length; i++) {
    var p = path.join(fluentDir(candidates[i]), 'node_modules', '.bin', 'now-sdk');
    if (fs.existsSync(p)) { return p; }
  }
  return 'now-sdk';
}

function run(cmd, args, opts) {
  opts = opts || {};
  return new Promise(function (resolve, reject) {
    var child = spawn(cmd, args, {
      cwd: opts.cwd || ROOT,
      env: opts.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    var stdout = '';
    var stderr = '';
    child.stdout.on('data', function (d) {
      stdout += d;
      if (opts.onChunk) { opts.onChunk(String(d), 'stdout'); }
    });
    child.stderr.on('data', function (d) {
      stderr += d;
      if (opts.onChunk) { opts.onChunk(String(d), 'stderr'); }
    });
    if (opts.stdin != null) {
      child.stdin.end(String(opts.stdin));
    } else {
      child.stdin.end();
    }
    child.on('error', reject);
    child.on('close', function (code) {
      resolve({ code: code, stdout: stdout, stderr: stderr });
    });
  });
}

function combinedOut(result) {
  return String(result.stdout || '') + String(result.stderr || '');
}

function readFluentSources(appFolder) {
  var dir = fluentDir(appFolder);
  var out = {};
  if (!fs.existsSync(dir)) { return out; }
  function walk(rel) {
    var abs = path.join(dir, rel);
    var st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (rel === 'node_modules' || rel === '.now') { return; }
      fs.readdirSync(abs).forEach(function (name) {
        walk(rel ? rel + '/' + name : name);
      });
      return;
    }
    if (!semver.isComparableFluentPath(rel)) { return; }
    if (st.size > 2 * 1024 * 1024) { return; } // skip huge outliers
    out[rel] = fs.readFileSync(abs, 'utf8');
  }
  walk('');
  return out;
}

async function ensureNpmInstall(appFolder, emit) {
  var dir = fluentDir(appFolder);
  var bin = path.join(dir, 'node_modules', '.bin', 'now-sdk');
  if (fs.existsSync(bin)) {
    if (emit) { emit({ step: 'npm', message: 'Now SDK already installed locally', pct: null }); }
    return;
  }
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    throw new Error('No Fluent project at apps/' + appFolder + '/deploy/fluent - build the Fluent package first.');
  }
  if (emit) { emit({ step: 'npm', message: 'Running npm install in deploy/fluent…', pct: null }); }
  var r = await run('npm', ['install'], { cwd: dir });
  if (r.code !== 0) {
    throw new Error('npm install failed in deploy/fluent:\n' + combinedOut(r).slice(-2000));
  }
}

async function handleAuth(body, emit) {
  var instanceUrl = normalizeInstanceUrl(body.instanceUrl);
  var username = String(body.username || '').trim();
  var password = String(body.password || '');
  if (!username) { throw new Error('username is required'); }
  if (!password) { throw new Error('password is required'); }
  var alias = String(body.alias || aliasFromUrl(instanceUrl)).trim() || aliasFromUrl(instanceUrl);
  var appForBin = body.appFolder || 'delivery-methodology';

  emit({ step: 'auth', message: 'Preparing Now SDK for auth…', pct: 10, ok: true });
  await ensureNpmInstall(appForBin, emit);
  var sdk = nowSdkBin(appForBin);
  var cwd = fluentDir(appForBin);

  emit({ step: 'auth', message: 'Updating SDK auth alias "' + alias + '"…', pct: 40, ok: true });
  await run(sdk, ['auth', '--delete', alias], { cwd: cwd });

  emit({ step: 'auth', message: 'Adding credentials for ' + instanceUrl + '…', pct: 60, ok: true });
  var add = await run(sdk, [
    'auth', '--add', instanceUrl,
    '--type', 'basic',
    '--alias', alias,
    '--username', username,
    '--password-stdin',
  ], { cwd: cwd, stdin: password });
  if (add.code !== 0) {
    throw new Error('now-sdk auth --add failed:\n' + combinedOut(add).slice(-2000));
  }

  emit({ step: 'auth', message: 'Selecting alias "' + alias + '"…', pct: 85, ok: true });
  var use = await run(sdk, ['auth', '--use', alias], { cwd: cwd });
  if (use.code !== 0) {
    throw new Error('now-sdk auth --use failed:\n' + combinedOut(use).slice(-2000));
  }

  emit({
    step: 'done',
    message: 'Synced Connect credentials to Now SDK alias "' + alias + '".',
    pct: 100,
    ok: true,
    alias: alias,
    host: instanceUrl,
    username: username,
  });
}

async function handleDeploy(body, emit) {
  var appFolder = String(body.appFolder || '').trim();
  if (!appFolder) { throw new Error('appFolder is required'); }
  var dir = fluentDir(appFolder);
  if (!fs.existsSync(path.join(dir, 'package.json')) && !fs.existsSync(path.join(ROOT, 'apps', appFolder, 'deploy.manifest.js'))) {
    throw new Error('Unknown app folder: ' + appFolder);
  }

  emit({ step: 'rebuild', message: 'Rebuilding Fluent project…', pct: 8, ok: true });
  var buildArgs = [path.join(__dirname, 'build.js'), appFolder];
  if (body.scope) { buildArgs.push('--scope=' + String(body.scope).trim()); }
  if (body.appName) { buildArgs.push('--app-name=' + String(body.appName).trim()); }
  if (body.version) { buildArgs.push('--version=' + String(body.version).trim()); }
  var build = await run('node', buildArgs, {
    cwd: ROOT,
    onChunk: function (chunk) {
      var line = String(chunk).trim().split('\n').pop();
      if (line) { emit({ step: 'rebuild', message: line.slice(0, 200), pct: 15, ok: true }); }
    },
  });
  if (build.code !== 0) {
    throw new Error('Packager Fluent rebuild failed:\n' + combinedOut(build).slice(-2000));
  }
  emit({ step: 'rebuild', message: 'Fluent project written to deploy/fluent/', pct: 30, ok: true });

  emit({ step: 'npm', message: 'Checking local Now SDK install…', pct: 35, ok: true });
  await ensureNpmInstall(appFolder, emit);
  emit({ step: 'npm', message: 'Dependencies ready', pct: 45, ok: true });

  var sdk = nowSdkBin(appFolder);
  var alias = String(body.alias || '').trim();

  emit({ step: 'build', message: 'Running now-sdk build…', pct: 50, ok: true });
  var sdkBuild = await run(sdk, ['build'], {
    cwd: dir,
    onChunk: function (chunk) {
      var line = String(chunk).trim().split('\n').pop();
      if (line) { emit({ step: 'build', message: line.slice(0, 200), pct: 60, ok: true }); }
    },
  });
  if (sdkBuild.code !== 0) {
    throw new Error('now-sdk build failed:\n' + combinedOut(sdkBuild).slice(-3000));
  }
  emit({ step: 'build', message: 'now-sdk build succeeded', pct: 70, ok: true });

  var installArgs = ['install'];
  if (alias) { installArgs.push('--auth', alias); }
  emit({ step: 'install', message: 'Running now-sdk install…', pct: 75, ok: true });
  var install = await run(sdk, installArgs, {
    cwd: dir,
    onChunk: function (chunk) {
      var line = String(chunk).trim().split('\n').pop();
      if (line) { emit({ step: 'install', message: line.slice(0, 200), pct: 88, ok: true }); }
    },
  });
  if (install.code !== 0) {
    throw new Error('now-sdk install failed:\n' + combinedOut(install).slice(-3000));
  }

  emit({
    step: 'done',
    message: 'Fluent package built and installed on the instance.',
    pct: 100,
    ok: true,
    appFolder: appFolder,
    alias: alias || null,
    detail: combinedOut(install).slice(-1500),
  });
}

var server = http.createServer(function (req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  var urlParts = req.url.split('?');
  var url = urlParts[0];
  var qs = new URLSearchParams(urlParts[1] || '');

  if (req.method === 'GET' && url === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'sn-deployment-packager-sdk-bridge',
      port: PORT,
      suiteRoot: ROOT,
      bridgeScript: path.join(__dirname, 'sdk-bridge.js'),
    });
    return;
  }

  if (req.method === 'GET' && url === '/fluent-sources') {
    var folder = String(qs.get('appFolder') || '').trim();
    if (!folder) {
      sendJson(res, 400, { ok: false, error: 'appFolder is required' });
      return;
    }
    try {
      sendJson(res, 200, { ok: true, appFolder: folder, files: readFluentSources(folder) });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
    }
    return;
  }

  if (req.method === 'POST' && (url === '/auth' || url === '/deploy')) {
    readJson(req).then(function (body) {
      var emit = beginNdjson(res);
      var run = url === '/auth' ? handleAuth(body, emit) : handleDeploy(body, emit);
      return run.catch(function (err) {
        emit({
          step: 'error',
          message: String((err && err.message) || err),
          pct: 100,
          ok: false,
          error: String((err && err.message) || err),
        });
      }).then(function () {
        res.end();
      });
    }).catch(function (err) {
      sendJson(res, 400, { ok: false, error: String((err && err.message) || err) });
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.on('error', function (err) {
  if (err && err.code === 'EADDRINUSE') {
    console.error('[sdk-bridge] Port ' + PORT + ' is already in use.');
    console.error('[sdk-bridge] A bridge is probably already running — in the packager console click Check again.');
    console.error('[sdk-bridge] Or run: curl http://127.0.0.1:' + PORT + '/health');
    process.exit(1);
  }
  console.error('[sdk-bridge] Failed to start:', err && err.message ? err.message : err);
  process.exit(1);
});

server.listen(PORT, HOST, function () {
  console.log('SN Deployment Packager SDK bridge listening on http://' + HOST + ':' + PORT);
  console.log('[sdk-bridge] suite root: ' + ROOT);
  console.log('[sdk-bridge] Endpoints: GET /health, GET /fluent-sources, POST /auth, POST /deploy (NDJSON)');
  console.log('[sdk-bridge] Leave this terminal open while using the packager console.');
});
