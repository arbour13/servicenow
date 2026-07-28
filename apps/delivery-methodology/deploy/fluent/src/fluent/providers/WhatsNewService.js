[function () {
  'use strict';

  var PHASE_COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--p5)'];
  var TODAY = (function () {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  })();

  var whatsNew = [];

  function unreadEntries(subPhase) {
    return (subPhase.changelog || []).filter(function (entry) { return !entry.read; });
  }

  function unreadCount(subPhase) {
    return unreadEntries(subPhase).length;
  }

  function anyUnread(methodologies) {
    return (methodologies || []).some(function (methodology) {
      return methodology.phases.some(function (phase) {
        return phase.subPhases.some(function (subPhase) {
          return unreadEntries(subPhase).length > 0;
        });
      });
    });
  }

  function phaseHasUnread(phase) {
    return phase.subPhases.some(function (subPhase) { return unreadCount(subPhase) > 0; });
  }

  function refresh(methodologies) {
    var items = [];
    (methodologies || []).forEach(function (methodology) {
      methodology.phases.forEach(function (phase, phaseIndex) {
        phase.subPhases.forEach(function (subPhase) {
          unreadEntries(subPhase).forEach(function (entry) {
            items.push({
              m: methodology,
              p: phase,
              pi: phaseIndex,
              s: subPhase,
              entry: entry,
              color: PHASE_COLORS[phaseIndex % PHASE_COLORS.length]
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
    entries.forEach(function (entry) { entry.read = true; });
    refresh(methodologies);
    return entries;
  }

  function fmtDate(dateStr) {
    var parts = String(dateStr).split('-');
    if (parts.length !== 3) { return dateStr; }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[+parts[1] - 1] + ' ' + (+parts[2]) + ', ' + parts[0];
  }

  function daysAgo(dateStr) {
    return Math.round((Date.parse(TODAY) - Date.parse(dateStr)) / 86400000);
  }

  function readState() {
    return { whatsNew: whatsNew };
  }

  return {
    unreadEntries: unreadEntries,
    unreadCount: unreadCount,
    anyUnread: anyUnread,
    phaseHasUnread: phaseHasUnread,
    markRead: markRead,
    refresh: refresh,
    fmtDate: fmtDate,
    daysAgo: daysAgo,
    readState: readState
  };
}]