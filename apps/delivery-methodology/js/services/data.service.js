/* Dual persistence: local harness uses localStorage + optional window.DMSeed (harness-only
   js/data/seed.js); Service Portal uses the widget server against the content table.
   Call bindServer(c.server) from the controller when c.server exists.
   Seed is NOT bundled for deploy (manifest providers[].deploy: false). */
angular.module('deliveryMethodology').factory('DataService', ['$q', 'UrlPolicyService', function ($q, UrlPolicyService) {
  'use strict';

  var STORAGE_KEY = 'gf-delivery-methodology-v1';
  var serverApi = null;
  var cachedJobTitles = null;
  var cachedJargon = null;
  var cachedReferenceSections = null;
  var cachedContentRevision = '';

  function readSeed() {
    try {
      return window.DMSeed || null;
    } catch (readError) {
      return null;
    }
  }

  function loadStoredLocal(seedVersion) {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      var parsed = JSON.parse(raw);

      if (parsed && parsed.version === seedVersion) {
        return parsed;
      }

      return null;
    } catch (loadError) {
      return null;
    }
  }

  function storeLocal(methodologies, seedVersion, jargon, referenceSections) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: seedVersion,
        methodologies: methodologies,
        jargon: jargon || {},
        referenceSections: referenceSections || []
      }));
    } catch (storeError) {
      /* storage unavailable/full - edits still work for this session */
    }
  }

  function setCachedJargon(jargon) {
    if (jargon && typeof jargon === 'object') {
      cachedJargon = jargon;
    } else {
      cachedJargon = {};
    }
  }

  function setCachedReferenceSections(referenceSections) {
    if (referenceSections) {
      cachedReferenceSections = referenceSections;
    } else {
      cachedReferenceSections = [];
    }
  }

  function blankSubPhase(id, sid, name, order, icon) {
    var seed = readSeed();

    if (seed && typeof seed.blankSubPhase === 'function') {
      return seed.blankSubPhase(id, sid, name, order, icon);
    }

    return {
      id: id,
      sid: sid,
      name: name,
      order: order,
      icon: icon || 'doc',
      changelog: [],
      overview: '',
      objective: '',
      participants: [],
      comments: [],
      inputs: [],
      deliverables: [],
      tasks: [],
      meetings: [],
      levelOfEffort: {
        mode: 'all',
        all: {},
        roles: {}
      }
    };
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function applySeedIcons(methodologies, seedMethodologies) {
    if (!seedMethodologies || !seedMethodologies.length) {
      return;
    }

    var iconById = {};

    seedMethodologies.forEach(function (methodology) {
      methodology.phases.forEach(function (phase) {
        phase.subPhases.forEach(function (subPhase) {
          if (subPhase.icon) {
            iconById[subPhase.id] = subPhase.icon;
          }
        });
      });
    });

    methodologies.forEach(function (methodology) {
      methodology.phases.forEach(function (phase) {
        phase.subPhases.forEach(function (subPhase) {
          if (iconById[subPhase.id]) {
            subPhase.icon = iconById[subPhase.id];
          } else if (!subPhase.icon) {
            subPhase.icon = 'doc';
          }
        });
      });
    });
  }

  function emptyPayload() {
    return {
      jobTitles: [],
      methodologies: [],
      jargon: {},
      referenceSections: []
    };
  }

  function seedPayload() {
    var seed = readSeed();

    if (!seed) {
      return emptyPayload();
    }

    var methodologies = deepClone(seed.methodologies || []);
    applySeedIcons(methodologies, seed.methodologies);

    return {
      jobTitles: deepClone(seed.jobTitles || []),
      methodologies: methodologies,
      jargon: deepClone(seed.jargon || {}),
      referenceSections: deepClone(seed.referenceSections || [])
    };
  }

  function cacheLookups(payload) {
    cachedJobTitles = payload.jobTitles;
    cachedJargon = payload.jargon;
    cachedReferenceSections = payload.referenceSections || [];
    if (payload && payload.contentRevision != null) {
      cachedContentRevision = String(payload.contentRevision);
    }
  }

  function localGetData() {
    return $q.resolve(buildLocalPayload());
  }

  function buildLocalPayload() {
    var seed = readSeed();
    var seedVersion = (seed && seed.version) || 0;
    var stored = loadStoredLocal(seedVersion);
    var payload = seedPayload();

    if (stored && stored.methodologies) {
      payload.methodologies = deepClone(stored.methodologies);
      applySeedIcons(payload.methodologies, seed && seed.methodologies);
    }

    if (stored && stored.jargon && typeof stored.jargon === 'object') {
      payload.jargon = deepClone(stored.jargon);
    }

    if (stored && stored.referenceSections && stored.referenceSections.length) {
      payload.referenceSections = deepClone(stored.referenceSections);
    }

    cacheLookups(payload);
    return payload;
  }

  function fromServerData(serverData) {
    return {
      jobTitles: serverData.jobTitles || [],
      methodologies: serverData.methodologies || [],
      jargon: serverData.jargon || {},
      referenceSections: serverData.referenceSections || [],
      contentRevision: serverData.contentRevision != null ? String(serverData.contentRevision) : '',
      changelogSeen: serverData.changelogSeen && typeof serverData.changelogSeen === 'object'
        ? serverData.changelogSeen
        : {}
    };
  }

  function rejectServerError(responseData, fallbackMessage) {
    var message = fallbackMessage || 'Content save failed.';
    if (responseData && responseData.error) {
      message = responseData.error;
    }
    return $q.reject({
      error: message,
      data: responseData
    });
  }

  function savePayload(methodologies) {
    return {
      action: 'save',
      methodologies: methodologies,
      jobTitles: cachedJobTitles || [],
      jargon: cachedJargon || {},
      referenceSections: cachedReferenceSections || [],
      contentRevision: cachedContentRevision || ''
    };
  }

  return {
    bindServer: function (api) {
      if (api && typeof api.get === 'function') {
        serverApi = api;
      }
    },
    getContentRevision: function () {
      return cachedContentRevision || '';
    },
    // Sync harness path - avoids a Loading… → content flash on first paint when there's no SN server.
    readLocalData: buildLocalPayload,
    getData: function () {
      if (!serverApi) {
        return localGetData();
      }

      return serverApi.get({
        action: 'load'
      }).then(function (response) {
        var responseData = (response && response.data) || {};

        if (responseData.error && !(responseData.methodologies && responseData.methodologies.length)) {
          return rejectServerError(responseData, 'Could not load content.');
        }

        // Empty methodologies is valid (fresh instance). Still keep job titles / jargon /
        // referenceSections from the response - emptyPayload() would wipe those lookups.
        // Harness-only DMSeed is never applied here (absent in production).
        var payload = fromServerData(responseData);
        cacheLookups(payload);
        return payload;
      }, function () {
        // Instance path: never fall back to harness localStorage/seed. Seed is not deployed;
        // a silent local resolve would mask the outage and could hydrate stale browser storage.
        return rejectServerError(null, 'Could not load content.');
      });
    },
    setCachedJargon: setCachedJargon,
    setCachedReferenceSections: setCachedReferenceSections,
    saveData: function (methodologies) {
      UrlPolicyService.normalizeMethodologies(methodologies);

      if (!serverApi) {
        var seed = readSeed();
        var seedVersion = (seed && seed.version) || 0;
        storeLocal(methodologies, seedVersion, cachedJargon || {}, cachedReferenceSections || []);
        return $q.resolve({
          saved: true
        });
      }

      return serverApi.get(savePayload(methodologies)).then(function (response) {
        var responseData = (response && response.data) || {};

        if (responseData.error || responseData.saved === false) {
          return rejectServerError(responseData);
        }

        if (responseData.jobTitles) {
          cachedJobTitles = responseData.jobTitles;
        }

        if (responseData.jargon) {
          cachedJargon = responseData.jargon;
        }

        if (responseData.referenceSections) {
          cachedReferenceSections = responseData.referenceSections;
        }

        if (responseData.contentRevision != null) {
          cachedContentRevision = String(responseData.contentRevision);
        }

        return responseData;
      });
    },
    // Testing counterpart to importStandardContent(): wipes ALL content so the empty state (and
    // the one-click import) can be exercised repeatedly. Deliberately does NOT go through
    // saveData() - that reuses cachedJobTitles/cachedJargon/cachedReferenceSections, which would
    // leave those lookup rows behind and the table non-empty, so the import's emptiness guard
    // would then refuse it. Sends explicitly empty collections instead, and clears the caches so a
    // subsequent save cannot resurrect them.
    resetAllContent: function () {
      cachedJobTitles = [];
      cachedJargon = {};
      cachedReferenceSections = [];

      if (!serverApi) {
        var seed = readSeed();
        var seedVersion = (seed && seed.version) || 0;
        storeLocal([], seedVersion, {}, []);
        return $q.resolve({
          saved: true
        });
      }

      return serverApi.get({
        action: 'clearAll',
        contentRevision: cachedContentRevision || ''
      }).then(function (response) {
        var responseData = (response && response.data) || {};

        if (responseData.error || responseData.saved === false) {
          return rejectServerError(responseData, 'Could not clear content.');
        }

        if (responseData.contentRevision != null) {
          cachedContentRevision = String(responseData.contentRevision);
        }

        return responseData;
      });
    },
    // One-time "Import Delivery 2.0 content" action for an instance whose content table is empty.
    // Harness fallback re-derives the payload from window.DMSeed and PERSISTS it (not just an
    // in-memory resolve) - the harness's own "empty" state only exists after a real
    // structure-edit delete-everything-and-save, so this should make the load durable, matching
    // what the server path does. The server itself refuses if the table isn't actually empty
    // (see content.server.js's importStandardContent action) - this does not duplicate that guard.
    importStandardContent: function () {
      if (!serverApi) {
        var payload = seedPayload();
        var seed = readSeed();
        var seedVersion = (seed && seed.version) || 0;
        storeLocal(payload.methodologies, seedVersion, payload.jargon || {}, payload.referenceSections || []);
        cacheLookups(payload);
        return $q.resolve(payload);
      }

      return serverApi.get({
        action: 'importStandardContent'
      }).then(function (response) {
        var responseData = (response && response.data) || {};

        if (responseData.error) {
          return rejectServerError(responseData, 'Could not import Delivery 2.0 content.');
        }

        var payload = fromServerData(responseData);
        cacheLookups(payload);
        return payload;
      }, function () {
        return rejectServerError(null, 'Could not import Delivery 2.0 content.');
      });
    },
    // Persist What's New read map. Harness is localStorage-only (WhatsNewService); SN writes
    // the dm.changelog.seen user preference. Failures are ignored — unread UI still works in-session.
    saveChangelogSeen: function (seenMap) {
      if (!serverApi) {
        return $q.resolve({
          saved: true
        });
      }

      return serverApi.get({
        action: 'saveChangelogSeen',
        changelogSeen: seenMap || {}
      }).then(function () {
        return {
          saved: true
        };
      }, function () {
        return {
          saved: false
        };
      });
    },
    resetData: function () {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (resetError) {
        /* ignore */
      }
    },
    blankSubPhase: blankSubPhase
  };
}]);
