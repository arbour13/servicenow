/* Semver helpers for the deploy console: bump levels and suggest major/minor/patch from a
   Fluent-vs-prior file diff. Works in Node (module.exports) and the browser (window.SNDeploymentPackager.semver). */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SNDeploymentPackager = root.SNDeploymentPackager || {};
    root.SNDeploymentPackager.semver = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parseSemver(version) {
    var parts = String(version || '').trim().split('.');
    if (parts.length !== 3 || !parts.every(function (p) { return /^\d+$/.test(p); })) {
      return null;
    }
    return {
      major: parseInt(parts[0], 10),
      minor: parseInt(parts[1], 10),
      patch: parseInt(parts[2], 10),
    };
  }

  function formatSemver(v) {
    return v.major + '.' + v.minor + '.' + v.patch;
  }

  function bumpSemver(version, level) {
    var v = parseSemver(version);
    if (!v) { return version; }
    if (level === 'major') { return formatSemver({ major: v.major + 1, minor: 0, patch: 0 }); }
    if (level === 'minor') { return formatSemver({ major: v.major, minor: v.minor + 1, patch: 0 }); }
    return formatSemver({ major: v.major, minor: v.minor, patch: v.patch + 1 });
  }

  // Paths that represent shipped app content (ignore SDK scaffolding / lockfiles / generated keys).
  function isComparableFluentPath(relPath) {
    var p = String(relPath || '').replace(/\\/g, '/');
    if (!p || p.indexOf('node_modules/') === 0) { return false; }
    if (/(^|\/)package-lock\.json$/.test(p)) { return false; }
    if (/(^|\/)generated\//.test(p)) { return false; }
    if (/\.now\.ts$/.test(p) && /\/generated\//.test(p)) { return false; }
    // Compare widget/provider sources and package metadata that affects install identity.
    if (/^src\/fluent\//.test(p)) { return true; }
    if (p === 'package.json' || p === 'now.config.json') { return true; }
    return false;
  }

  function utf8Len(s) {
    if (typeof TextEncoder !== 'undefined') { return new TextEncoder().encode(String(s || '')).length; }
    // Node / older engines: approximate with Buffer when available.
    if (typeof Buffer !== 'undefined') { return Buffer.byteLength(String(s || ''), 'utf8'); }
    return String(s || '').length;
  }

  function diffFluentFiles(prevFiles, nextFiles) {
    prevFiles = prevFiles || {};
    nextFiles = nextFiles || {};
    var paths = {};
    Object.keys(prevFiles).forEach(function (p) {
      if (isComparableFluentPath(p)) { paths[p] = true; }
    });
    Object.keys(nextFiles).forEach(function (p) {
      if (isComparableFluentPath(p)) { paths[p] = true; }
    });

    var filesChanged = 0;
    var bytesChanged = 0;
    var bytesTotal = 0;
    Object.keys(paths).forEach(function (p) {
      var a = prevFiles[p];
      var b = nextFiles[p];
      var aStr = a == null ? null : String(a);
      var bStr = b == null ? null : String(b);
      var bLen = bStr == null ? 0 : utf8Len(bStr);
      bytesTotal += bLen;
      if (aStr === bStr) { return; }
      filesChanged += 1;
      var aLen = aStr == null ? 0 : utf8Len(aStr);
      bytesChanged += Math.abs(bLen - aLen);
      // Content rewrite with similar length still counts — add a floor for equal-length edits.
      if (aStr != null && bStr != null && aLen === bLen && aStr !== bStr) {
        bytesChanged += Math.max(256, Math.floor(bLen * 0.05));
      }
    });
    return { filesChanged: filesChanged, bytesChanged: bytesChanged, bytesTotal: bytesTotal };
  }

  function classifyDiff(diff) {
    if (!diff || (diff.filesChanged === 0 && diff.bytesChanged === 0)) { return 'patch'; }
    var frac = diff.bytesTotal > 0 ? (diff.bytesChanged / diff.bytesTotal) : 0;
    // Fraction only counts on sizable packages — a 6-byte edit of a 7-byte file is not "major".
    if (diff.filesChanged > 10 || diff.bytesChanged >= 50000 ||
        (diff.bytesTotal >= 10240 && frac >= 0.5)) {
      return 'major';
    }
    if (diff.filesChanged > 2 || diff.bytesChanged >= 2048) { return 'minor'; }
    return 'patch';
  }

  function formatBytes(n) {
    if (n < 1024) { return n + 'B'; }
    if (n < 1024 * 1024) { return (Math.round(n / 102.4) / 10) + 'KB'; }
    return (Math.round(n / (1024 * 102.4)) / 10) + 'MB';
  }

  function compareSemver(a, b) {
    var va = parseSemver(a);
    var vb = parseSemver(b);
    if (!va || !vb) { return null; }
    if (va.major !== vb.major) { return va.major - vb.major; }
    if (va.minor !== vb.minor) { return va.minor - vb.minor; }
    return va.patch - vb.patch;
  }

  // Returns candidate if it is strictly greater than floor; otherwise bumpPatch(floor).
  // Non-semver floor/candidate: prefer a patch bump of floor when floor parses, else candidate.
  function ensureHigherThan(candidate, floor) {
    if (!floor || !parseSemver(floor)) { return candidate; }
    var cmp = compareSemver(candidate, floor);
    if (cmp != null && cmp > 0) { return candidate; }
    return bumpSemver(floor, 'patch');
  }

  // Suggest the next version from baseVersion + Fluent file churn.
  // When opts.minVersion is set (installed instance version), the result is always strictly higher.
  // Returns { version, level, reason, diff }.
  function suggestRelease(opts) {
    opts = opts || {};
    var base = opts.baseVersion || '1.0.0';
    var minVersion = opts.minVersion || (opts.installed ? base : null);
    var prev = opts.prevFiles;
    var next = opts.nextFiles || {};
    var hasPrior = !!(prev && Object.keys(prev).some(isComparableFluentPath));
    var level;
    var version;
    var reason;
    var diff = { filesChanged: 0, bytesChanged: 0, bytesTotal: 0 };

    if (!hasPrior) {
      level = 'patch';
      if (minVersion && parseSemver(minVersion)) {
        version = bumpSemver(minVersion, 'patch');
        reason = 'Suggested ' + version + ' (patch) — no prior Fluent build to compare; must be above installed v' + minVersion + '.';
      } else {
        version = parseSemver(base) ? base : '1.0.0';
        reason = 'Suggested ' + version + ' — no prior Fluent build to compare.';
      }
    } else {
      diff = diffFluentFiles(prev, next);
      level = classifyDiff(diff);
      if (diff.filesChanged === 0 && diff.bytesChanged === 0) { level = 'patch'; }
      version = bumpSemver(base, level);
      if (!parseSemver(version)) { version = base; }
      reason = 'Suggested ' + version + ' (' + level + ') — ' +
        diff.filesChanged + ' file' + (diff.filesChanged === 1 ? '' : 's') +
        ', ~' + formatBytes(diff.bytesChanged) + ' vs last Fluent build.';
    }

    if (minVersion && parseSemver(minVersion)) {
      var raised = ensureHigherThan(version, minVersion);
      if (raised !== version) {
        version = raised;
        level = 'patch';
        reason = 'Suggested ' + version + ' (patch) — raised above installed v' + minVersion + '.';
      }
    }

    return { version: version, level: level, reason: reason, diff: diff };
  }

  return {
    parseSemver: parseSemver,
    compareSemver: compareSemver,
    bumpSemver: bumpSemver,
    bumpPatchVersion: function (v) { return bumpSemver(v, 'patch'); },
    ensureHigherThan: ensureHigherThan,
    isComparableFluentPath: isComparableFluentPath,
    diffFluentFiles: diffFluentFiles,
    suggestRelease: suggestRelease,
  };
});
