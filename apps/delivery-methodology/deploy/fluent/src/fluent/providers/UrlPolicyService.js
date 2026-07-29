[function () {
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

    return raw;
  }

  var embedded = {
    normalizeHref: function (value, options) {
      return normalize(value, {
        allowMailto: true,
        instanceOrigins: options && options.instanceOrigins
      });
    },
    normalizeSrc: function (value, options) {
      return normalize(value, {
        allowMailto: false,
        instanceOrigins: options && options.instanceOrigins
      });
    },
    normalizeMethodologies: function (methodologies, options) {
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
        methodology.feedbackUrl = embedded.normalizeHref(methodology.feedbackUrl, urlOpts);
        methodology.diagramUrl = embedded.normalizeSrc(methodology.diagramUrl, urlOpts);

        (methodology.phases || []).forEach(function (phase) {
          (phase.subPhases || []).forEach(function (subPhase) {
            (subPhase.tasks || []).forEach(function (task) {
              (task.jobAids || []).forEach(function (jobAid) {
                if (jobAid) {
                  jobAid.url = embedded.normalizeHref(jobAid.url, urlOpts);
                }
              });
            });
          });
        });
      }

      return list;
    }
  };

  function policy() {
    if (typeof DMUrlPolicy !== 'undefined') {
      return DMUrlPolicy;
    }
    return embedded;
  }

  function currentOrigins() {
    var origins = [];
    try {
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        origins.push(window.location.origin);
      }
    } catch (originError) {
      /* harness / restricted context */
    }
    return origins;
  }

  function options() {
    return {
      instanceOrigins: currentOrigins()
    };
  }

  function normalizeHref(value) {
    return policy().normalizeHref(value, options());
  }

  function normalizeSrc(value) {
    return policy().normalizeSrc(value, options());
  }

  function normalizeMethodologies(methodologies) {
    return policy().normalizeMethodologies(methodologies, options());
  }

  function normalizeJobAidUrl(jobAid) {
    if (!jobAid) {
      return '';
    }
    jobAid.url = normalizeHref(jobAid.url);
    return jobAid.url;
  }

  function bind(controller) {
    controller.safeHref = normalizeHref;
    controller.safeSrc = normalizeSrc;
    controller.normalizeJobAidUrl = normalizeJobAidUrl;
  }

  return {
    normalizeHref: normalizeHref,
    normalizeSrc: normalizeSrc,
    normalizeMethodologies: normalizeMethodologies,
    normalizeJobAidUrl: normalizeJobAidUrl,
    bind: bind
  };
}]