['$q', 'UrlPolicyService', function ($q, UrlPolicyService) {
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

  function loadStoredMethodologies(seedVersion) {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      var parsed = JSON.parse(raw);

      if (parsed && parsed.version === seedVersion) {
        return parsed.methodologies;
      }

      return null;
    } catch (loadError) {
      return null;
    }
  }

  function storeMethodologies(methodologies, seedVersion) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: seedVersion,
        methodologies: methodologies
      }));
    } catch (storeError) {
      /* storage unavailable/full - edits still work for this session */
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
    var stored = loadStoredMethodologies(seedVersion);
    var payload = seedPayload();

    if (stored) {
      payload.methodologies = deepClone(stored);
      applySeedIcons(payload.methodologies, seed && seed.methodologies);
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
    saveData: function (methodologies) {
      UrlPolicyService.normalizeMethodologies(methodologies);

      if (!serverApi) {
        var seed = readSeed();
        var seedVersion = (seed && seed.version) || 0;
        storeMethodologies(methodologies, seedVersion);
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
}]