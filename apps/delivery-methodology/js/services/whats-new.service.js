/* What's New aggregation and per-user read/unread for changelog entries.
   Seen map is keyed by changelog content.id (stable across full-replace saves). Persists to
   localStorage always; on ServiceNow also via user preference dm.changelog.seen (DataService). */
angular.module('deliveryMethodology').factory('WhatsNewService', [
  'MethodologyDomainService', 'DataService',
  function (MethodologyDomainService, DataService) {
  'use strict';

  var PREFERENCE_KEY = 'dm.changelog.seen';
  var TODAY = (function () {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var monthPart = String(month);
    var dayPart = String(day);
    if (month < 10) {
      monthPart = '0' + month;
    }
    if (day < 10) {
      dayPart = '0' + day;
    }
    return date.getFullYear() + '-' + monthPart + '-' + dayPart;
  })();

  // How many already-read entries the view keeps below the unread ones. Unread-only left the page
  // nearly blank in normal use (once you have caught up there is by definition nothing to show),
  // and it also made a change you had just opened impossible to find again. Capped rather than
  // unbounded because this list only grows as the methodology is edited over time.
  var READ_HISTORY_LIMIT = 20;

  var whatsNew = [];
  var whatsNewRead = [];
  var seenMap = {};

  function readLocalSeen() {
    try {
      var raw = window.localStorage.getItem(PREFERENCE_KEY);
      if (!raw) {
        return {};
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (readError) {
      return {};
    }
  }

  function writeLocalSeen(map) {
    try {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(map || {}));
    } catch (writeError) {
      /* storage unavailable - session map still applies until reload */
    }
  }

  function mergeSeen(into, from) {
    Object.keys(from || {}).forEach(function (entryId) {
      if (from[entryId]) {
        into[entryId] = true;
      }
    });
    return into;
  }

  function persistSeen() {
    writeLocalSeen(seenMap);
    DataService.saveChangelogSeen(seenMap);
  }

  function applySeenToMethodologies(methodologies) {
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          (subPhase.changelog || []).forEach(function (entry) {
            if (entry && entry.id && seenMap[entry.id]) {
              entry.read = true;
            }
          });
        });
      });
    });
  }

  // Call after content load. Merges server preference (if any) with localStorage, stamps entry.read.
  function hydrateSeen(methodologies, serverSeen) {
    seenMap = {};
    mergeSeen(seenMap, readLocalSeen());
    mergeSeen(seenMap, serverSeen);
    writeLocalSeen(seenMap);
    applySeenToMethodologies(methodologies);
    return refresh(methodologies);
  }

  function rememberSeenEntries(entries) {
    var changed = false;
    (entries || []).forEach(function (entry) {
      if (entry && entry.id && !seenMap[entry.id]) {
        seenMap[entry.id] = true;
        entry.read = true;
        changed = true;
      }
    });
    if (changed) {
      persistSeen();
    }
  }

  function unreadEntries(subPhase) {
    return (subPhase.changelog || []).filter(function (entry) {
      return !entry.read;
    });
  }

  function unreadCount(subPhase) {
    return unreadEntries(subPhase).length;
  }

  function anyUnread(methodologies) {
    return (methodologies || []).some(function (methodology) {
      return (methodology.phases || []).some(function (phase) {
        return (phase.subPhases || []).some(function (subPhase) {
          return unreadEntries(subPhase).length > 0;
        });
      });
    });
  }

  function phaseHasUnread(phase) {
    return (phase.subPhases || []).some(function (subPhase) {
      return unreadCount(subPhase) > 0;
    });
  }

  function refresh(methodologies) {
    var items = [];
    var readItems = [];
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase, phaseIndex) {
        (phase.subPhases || []).forEach(function (subPhase) {
          (subPhase.changelog || []).forEach(function (entry) {
            var item = {
              methodology: methodology,
              phase: phase,
              phaseIndex: phaseIndex,
              subPhase: subPhase,
              entry: entry,
              color: MethodologyDomainService.phaseColor(phaseIndex)
            };

            if (entry.read) {
              readItems.push(item);
            } else {
              items.push(item);
            }
          });
        });
      });
    });

    function newestFirst(left, right) {
      return Date.parse(right.entry.ts) - Date.parse(left.entry.ts);
    }

    items.sort(newestFirst);
    readItems.sort(newestFirst);
    whatsNew = items;
    whatsNewRead = readItems.slice(0, READ_HISTORY_LIMIT);
    return whatsNew;
  }

  function markRead(subPhase, methodologies) {
    var entries = unreadEntries(subPhase);
    entries.forEach(function (entry) {
      entry.read = true;
      if (entry.id) {
        seenMap[entry.id] = true;
      }
    });
    if (entries.length) {
      persistSeen();
    }
    refresh(methodologies);
    return entries;
  }

  function formatDate(dateStr) {
    var parts = String(dateStr).split('-');
    if (parts.length !== 3) {
      return dateStr;
    }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[+parts[1] - 1] + ' ' + (+parts[2]) + ', ' + parts[0];
  }

  function daysAgo(dateStr) {
    return Math.round((Date.parse(TODAY) - Date.parse(dateStr)) / 86400000);
  }

  function readState() {
    return {
      whatsNew: whatsNew,
      whatsNewRead: whatsNewRead
    };
  }

  function bindFormatters(controller) {
    controller.formatDate = formatDate;
    controller.daysAgo = daysAgo;
  }

  return {
    unreadEntries: unreadEntries,
    unreadCount: unreadCount,
    anyUnread: anyUnread,
    phaseHasUnread: phaseHasUnread,
    markRead: markRead,
    rememberSeenEntries: rememberSeenEntries,
    hydrateSeen: hydrateSeen,
    refresh: refresh,
    formatDate: formatDate,
    daysAgo: daysAgo,
    readState: readState,
    bindFormatters: bindFormatters
  };
}]);
