/* Sub-phase filmstrip icon library and name-based fallback keys. */
angular.module('deliveryMethodology').factory('IconService', ['$sce', function ($sce) {
  'use strict';

  var SUBPHASE_ICONS = {
    exchange: '<path d="M17 3l4 4-4 4"/><path d="M21 7H8"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h13"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/>',
    users: '<circle cx="8.5" cy="8" r="3"/><path d="M2.5 20a6 6 0 0 1 12 0"/><circle cx="17" cy="8.5" r="2.3"/><path d="M15 20a5 5 0 0 1 7-4.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    code: '<path d="M8 9l-4 3 4 3"/><path d="M16 9l4 3-4 3"/><path d="M13 7l-2 10"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6M9 15h6"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-1-7.9 5 5 0 0 1 9.6-1.7A4.5 4.5 0 0 1 17 18H7z"/><path d="M12 17v-6M9.5 13.5L12 11l2.5 2.5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    door: '<path d="M13 4h3a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2h3"/><path d="M10 4v16"/><path d="M15 12h.01"/>',
    presentation: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="M12 16v5"/><path d="M8 21h8"/><path d="M7 8l3 3 5-5"/>',
    archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
    scales: '<path d="M12 3v18"/><path d="M5 6h14"/><path d="M5 6l-3 7a3 3 0 0 0 6 0L5 6"/><path d="M19 6l-3 7a3 3 0 0 0 6 0l-3-7"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v7.5L5.5 19a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3L14 10.5V3"/><path d="M8.5 14h7"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    stamp: '<path d="M12 3v8"/><path d="M8.5 8.5L12 12l3.5-3.5"/><rect x="5" y="14" width="14" height="7" rx="1"/><path d="M8 17h8"/>',
    lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'
  };

  var ICON_HTML = {};
  Object.keys(SUBPHASE_ICONS).forEach(function (key) {
    ICON_HTML[key] = $sce.trustAsHtml(SUBPHASE_ICONS[key]);
  });

  function fallbackKey(name) {
    var normalized = String(name || '').toLowerCase();
    if (/ipkt|pre-kickoff|touchpoint/.test(normalized)) {
      return 'exchange';
    }
    if (/kickoff/.test(normalized)) {
      return 'flag';
    }
    if (/team/.test(normalized)) {
      return 'users';
    }
    if (/workshop|check-in/.test(normalized)) {
      return 'calendar';
    }
    if (/build/.test(normalized)) {
      return 'code';
    }
    if (/uat|validation|readiness|signoff/.test(normalized)) {
      return 'shield';
    }
    if (/sprint|planning|scope|refinement/.test(normalized)) {
      return 'clipboard';
    }
    if (/deploy|go live|hypercare|preparedness/.test(normalized)) {
      return 'cloud';
    }
    if (/retrospective|closure|lesson/.test(normalized)) {
      return 'check';
    }
    return 'doc';
  }

  function hasKey(key) {
    return !!ICON_HTML[key];
  }

  function keyFor(subPhase) {
    if (subPhase && subPhase.icon && ICON_HTML[subPhase.icon]) {
      return subPhase.icon;
    }
    return fallbackKey(subPhase && subPhase.name);
  }

  function pathsFor(subPhase) {
    return ICON_HTML[keyFor(subPhase)];
  }

  function ensureIcon(subPhase) {
    if (!subPhase) {
      return;
    }
    if (!subPhase.icon || !ICON_HTML[subPhase.icon]) {
      subPhase.icon = fallbackKey(subPhase.name);
    }
  }

  return {
    pathsFor: pathsFor,
    keyFor: keyFor,
    fallbackKey: fallbackKey,
    hasKey: hasKey,
    ensureIcon: ensureIcon
  };
}]);
