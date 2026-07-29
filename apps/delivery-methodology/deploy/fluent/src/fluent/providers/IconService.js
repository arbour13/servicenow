['$sce', function ($sce) {
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

  // Chrome / chrome-adjacent glyphs. calendar + message alias the sub-phase paths so one
  // drawing serves filmstrip content keys and UI call sites (meeting card, comments).
  var UI_ICONS = {
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    grid: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>',
    book: '<path d="M12 6.5a6 6 0 0 0-8 0v12a6 6 0 0 1 8 0 6 6 0 0 1 8 0v-12a6 6 0 0 0-8 0zM12 6.5V19"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    chevronUp: '<path d="M6 15l6-6 6 6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    checkmark: '<polyline points="4 12 9 17 20 6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    externalLink: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
    userGroup: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: SUBPHASE_ICONS.calendar,
    message: SUBPHASE_ICONS.message
  };

  var SUBPHASE_HTML = {};
  Object.keys(SUBPHASE_ICONS).forEach(function (key) {
    SUBPHASE_HTML[key] = $sce.trustAsHtml(SUBPHASE_ICONS[key]);
  });

  var UI_HTML = {};
  Object.keys(UI_ICONS).forEach(function (key) {
    UI_HTML[key] = $sce.trustAsHtml(UI_ICONS[key]);
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
    return !!SUBPHASE_HTML[key];
  }

  function keyFor(subPhase) {
    if (subPhase && subPhase.icon && SUBPHASE_HTML[subPhase.icon]) {
      return subPhase.icon;
    }
    return fallbackKey(subPhase && subPhase.name);
  }

  function pathsFor(subPhase) {
    return SUBPHASE_HTML[keyFor(subPhase)];
  }

  function paths(name) {
    return UI_HTML[name] || null;
  }

  function ensureIcon(subPhase) {
    if (!subPhase) {
      return;
    }
    if (!subPhase.icon || !SUBPHASE_HTML[subPhase.icon]) {
      subPhase.icon = fallbackKey(subPhase.name);
    }
  }

  function bind(controller) {
    controller.icon = paths;
  }

  return {
    paths: paths,
    pathsFor: pathsFor,
    keyFor: keyFor,
    fallbackKey: fallbackKey,
    hasKey: hasKey,
    ensureIcon: ensureIcon,
    bind: bind
  };
}]