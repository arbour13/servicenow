/* Editor URL policy: scheme allowlist + strip ServiceNow instance origins to relative paths.
   Shared by the widget server (concatenated ahead of content-model) and the browser harness /
   UrlPolicyService. Soft-fail friendly: empty string means "do not link / do not persist".
   Rhino-safe - no URL / window / document APIs. */
var DMUrlPolicy = (function () {
  'use strict';

  var HREF_SCHEMES = {
    http: true,
    https: true,
    mailto: true
  };
  var SRC_SCHEMES = {
    http: true,
    https: true
  };

  function trim(value) {
    return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
  }

  function schemeOf(value) {
    var match = String(value).match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    return match ? match[1].toLowerCase() : '';
  }

  function isServiceNowHost(host) {
    var normalized = String(host || '').toLowerCase();
    return normalized === 'service-now.com' || normalized.slice(-16) === '.service-now.com';
  }

  function normalizeOrigin(origin) {
    return trim(origin).replace(/\/$/, '').toLowerCase();
  }

  // https://user:pass@host:port/path?query#hash → parts (null if not http(s)).
  function parseHttpUrl(value) {
    var match = String(value).match(/^(https?):\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i);
    if (!match) {
      return null;
    }

    var hostPort = match[2];
    var at = hostPort.lastIndexOf('@');
    if (at >= 0) {
      hostPort = hostPort.slice(at + 1);
    }

    var host = hostPort;
    var colon = hostPort.indexOf(':');
    if (colon >= 0) {
      host = hostPort.slice(0, colon);
    }

    return {
      scheme: match[1].toLowerCase(),
      host: host.toLowerCase(),
      hostPort: hostPort.toLowerCase(),
      path: match[3] || '/',
      search: match[4] || '',
      hash: match[5] || '',
      origin: match[1].toLowerCase() + '://' + hostPort.toLowerCase()
    };
  }

  function shouldStripOrigin(parsed, instanceOrigins) {
    if (isServiceNowHost(parsed.host)) {
      return true;
    }

    var list = instanceOrigins || [];
    var index;
    for (index = 0; index < list.length; index++) {
      var origin = normalizeOrigin(list[index]);
      if (origin && parsed.origin === origin) {
        return true;
      }
    }
    return false;
  }

  // Instance links become query-relative so they resolve on whatever path the portal
  // page is served from (…/sp?id=… → ?id=…). Path-only URLs (no ?) keep path+hash.
  function toRelative(parsed) {
    if (parsed.search) {
      return parsed.search + parsed.hash;
    }
    var path = parsed.path || '/';
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    return path + parsed.hash;
  }

  function normalize(value, options) {
    var opts = options || {};
    var allowed = opts.allowMailto ? HREF_SCHEMES : SRC_SCHEMES;
    var raw = trim(value);

    if (!raw) {
      return '';
    }

    // Protocol-relative URLs inherit the page scheme and are too easy to weaponize.
    if (raw.slice(0, 2) === '//') {
      return '';
    }

    var scheme = schemeOf(raw);
    if (scheme) {
      if (!allowed[scheme]) {
        return '';
      }
      if (scheme === 'mailto') {
        return raw;
      }

      var parsed = parseHttpUrl(raw);
      if (!parsed) {
        return '';
      }
      if (shouldStripOrigin(parsed, opts.instanceOrigins)) {
        return toRelative(parsed);
      }
      return parsed.scheme + '://' + parsed.hostPort + (parsed.path || '/') + parsed.search + parsed.hash;
    }

    // No scheme → already relative / in-app (#, /sp?…, kb_view.do?…).
    return raw;
  }

  function normalizeHref(value, options) {
    return normalize(value, {
      allowMailto: true,
      instanceOrigins: options && options.instanceOrigins
    });
  }

  function normalizeSrc(value, options) {
    return normalize(value, {
      allowMailto: false,
      instanceOrigins: options && options.instanceOrigins
    });
  }

  function normalizeMethodologies(methodologies, options) {
    var list = methodologies || [];
    var urlOpts = {
      instanceOrigins: (options && options.instanceOrigins) || []
    };
    var methodologyIndex;

    for (methodologyIndex = 0; methodologyIndex < list.length; methodologyIndex++) {
      var methodology = list[methodologyIndex];
      if (!methodology) {
        continue;
      }
      methodology.feedbackUrl = normalizeHref(methodology.feedbackUrl, urlOpts);
      methodology.diagramUrl = normalizeSrc(methodology.diagramUrl, urlOpts);

      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          (subPhase.tasks || []).forEach(function (task) {
            (task.jobAids || []).forEach(function (jobAid) {
              if (jobAid) {
                jobAid.url = normalizeHref(jobAid.url, urlOpts);
              }
            });
          });
        });
      });
    }

    return list;
  }

  return {
    normalizeHref: normalizeHref,
    normalizeSrc: normalizeSrc,
    normalizeMethodologies: normalizeMethodologies
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = DMUrlPolicy;
}
if (typeof self !== 'undefined') {
  self.DMUrlPolicy = DMUrlPolicy;
}
