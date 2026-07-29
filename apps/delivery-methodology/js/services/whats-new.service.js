/* What's New aggregation and session read/unread helpers.
   Mutates changelog entry.read in memory only - never persists (SCHEMA prefs later). */
angular.module('deliveryMethodology').factory('WhatsNewService', [
  'MethodologyDomainService',
  function (MethodologyDomainService) {
  'use strict';

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

  var whatsNew = [];

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
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase, phaseIndex) {
        (phase.subPhases || []).forEach(function (subPhase) {
          unreadEntries(subPhase).forEach(function (entry) {
            items.push({
              methodology: methodology,
              phase: phase,
              phaseIndex: phaseIndex,
              subPhase: subPhase,
              entry: entry,
              color: MethodologyDomainService.phaseColor(phaseIndex)
            });
          });
        });
      });
    });
    items.sort(function (left, right) {
      return Date.parse(right.entry.ts) - Date.parse(left.entry.ts);
    });
    whatsNew = items;
    return whatsNew;
  }

  function markRead(subPhase, methodologies) {
    var entries = unreadEntries(subPhase);
    entries.forEach(function (entry) {
      entry.read = true;
    });
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
      whatsNew: whatsNew
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
    refresh: refresh,
    formatDate: formatDate,
    daysAgo: daysAgo,
    readState: readState,
    bindFormatters: bindFormatters
  };
}]);
