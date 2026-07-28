/* Mirrors the standalone prototype's (delivery-methodology.html) render*() logic 1:1, translated
   from innerHTML-string building into controller state + declarative template bindings
   (index.html). All views (Journey read + edit, RACI grid/by-role, Reference, What's New, Search)
   are ported. */
angular.module('deliveryMethodology').controller('MainController', ['DataService', '$sce', '$timeout', '$q', 'ThemeService', function (DataService, $sce, $timeout, $q, ThemeService) {
  'use strict';
  var c = this;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Init with this app's own key prefix so its stored preference doesn't collide with any other
  // app's. c.theme is a thin display mirror the template reads; this app has no separate
  // code-editor pane, so only the app-level theme half of the service is used.
  ThemeService.init('deliveryMethodology');

  /* Deployed-widget theme plumbing. ThemeService writes data-theme to <html>, which is right in
     this dev harness. It is NOT enough once packaged: the packager scopes this app's whole
     stylesheet under .dm-widget (deploy.manifest.js widgetScopeClass), so :root[data-theme="light"]
     compiles to .dm-widget[data-theme="light"] - and .dm-widget is a wrapper the packager generates
     around our markup, which this app has no way to author an attribute onto.
     Stamping the inner .app div instead does NOT work: .dm-widget itself carries
     `background: var(--paper)` (it's what `body {...}` compiles to), while .app paints nothing, so
     light tokens on .app would render light content inside a dark frame. CSS can't select an
     ancestor, so the attribute has to land on .dm-widget at runtime - here.
     $timeout(0) because on first run the widget element may not be in the DOM yet; on toggle it
     already is. No-op in this harness, where .dm-widget doesn't exist. */
  function stampWidgetTheme() {
    var w = document.querySelector('.dm-widget');
    if (w) { w.setAttribute('data-theme', c.theme); }
  }
  function syncTheme() {
    c.theme = ThemeService.readState().theme;
    $timeout(stampWidgetTheme, 0);
  }
  syncTheme();
  c.toggleTheme = function () { ThemeService.toggleApp(); syncTheme(); };

  // Editor/admin roles set data.canEdit in the widget server script. Local harness has no server
  // payload, so default true. Read-only users (role `user` only) cannot enter edit.
  c.canEdit = !(c.data && c.data.canEdit === false);
  function denyEdit() { showToast('You do not have permission to edit'); }

  // Service Portal exposes c.server; the local harness does not. Bind so getData/saveData hit the
  // content table when deployed.
  if (c.server) { DataService.bindServer(c.server); }

  c.toast = { show: false, msg: '' };
  var toastTimer = null;
  function showToast(msg) {
    c.toast.msg = msg;
    c.toast.show = true;
    if (toastTimer) { $timeout.cancel(toastTimer); }
    toastTimer = $timeout(function () { c.toast.show = false; }, 2200);
  }

  // Persist via DataService; surface server/local failures instead of fire-and-forget.
  // Reject after the error toast so callers can withhold success UI / keep edit drafts open.
  function persistMethodologies() {
    return DataService.saveData(c.methodologies).then(null, function (err) {
      var msg = (err && err.error) ? err.error : 'Could not save changes.';
      showToast(msg);
      return $q.reject(err);
    });
  }

  // CSS var references (not literal hexes) so every inline style="--nc/--pc: ..." binding and
  // ng-style="{background: ...}" swatch that consumes these stays theme-aware - each var(--pN) is
  // resolved live at the point of use, tracking whichever theme is active rather than freezing the
  // dark-mode brights (same fix as jobTitleColor() above).
  var PHASE_COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--p5)'];
  // Icon library for sub-phase filmstrip cards. Seeded sub-phases pick one via sp.icon;
  // subPhaseIconKey() remains only as a fallback for legacy/localStorage rows that lack icon.
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
  // Cached once per icon key, not per sub-phase or per call: $sce.trustAsHtml() returns a new
  // wrapper object every invocation, and binding that directly into ng-bind-html from a
  // ng-repeat has the exact same infinite-digest problem as c.loc below - a fresh, non-equal
  // reference every digest never lets the watch settle.
  var ICON_HTML = {};
  Object.keys(SUBPHASE_ICONS).forEach(function (k) { ICON_HTML[k] = $sce.trustAsHtml(SUBPHASE_ICONS[k]); });

  // Fallback only - seeded rows carry sp.icon. Used for legacy localStorage data and brand-new
  // structure-edit stubs that haven't picked an icon yet.
  function subPhaseIconKey(name) {
    var n = String(name || '').toLowerCase();
    if (/ipkt|pre-kickoff|touchpoint/.test(n)) { return 'exchange'; }
    if (/kickoff/.test(n)) { return 'flag'; }
    if (/team/.test(n)) { return 'users'; }
    if (/workshop|check-in/.test(n)) { return 'calendar'; }
    if (/build/.test(n)) { return 'code'; }
    if (/uat|validation|readiness|signoff/.test(n)) { return 'shield'; }
    if (/sprint|planning|scope|refinement/.test(n)) { return 'clipboard'; }
    if (/deploy|go live|hypercare|preparedness/.test(n)) { return 'cloud'; }
    if (/retrospective|closure|lesson/.test(n)) { return 'check'; }
    return 'doc';
  }

  function iconKeyFor(sp) {
    if (sp && sp.icon && ICON_HTML[sp.icon]) { return sp.icon; }
    return subPhaseIconKey(sp && sp.name);
  }

  c.raciLetters = ['R', 'A', 'C', 'I'];
  c.raciNames = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };
  c.raciTip = function (letters) {
    if (!letters || !letters.length) { return ''; }
    return letters.map(function (l) { return c.raciNames[l]; }).join(' / ');
  };
  c.raciHex = { R: '#01cc52', A: '#e5c20b', C: '#3ec2f8', I: '#bdc2cb' };

  /* ================= Jargon term highlighting + tooltip engine =================
     Ported from the prototype's withJargon()/wireTooltips(). Two independent pieces:
     - jargonHtml(text): wraps glossary terms (IPKT, RTM, SOW, ...) in a `.jargon-term` span
       carrying data-tip-name/data-tip, memoized per (text, c.showJargon) so the same
       $sce.trustAsHtml-wrapped value is returned on repeat calls - a fresh trusted-html object
       every digest is the same infinite-digest trap as ICON_HTML above.
     - the tip itself (c.tip) is driven by event delegation on the app root (see
       c.tipMouseOver/Out in index.html) rather than per-element ng-mouseenter directives,
       because jargon-term spans are raw DOM inserted via ng-bind-html and were never compiled by
       Angular - a single delegated listener picks up data-tip attributes regardless of whether
       Angular or ng-bind-html's raw innerHTML produced them. */
  var JARGON = {};
  c.showJargon = false;

  // Methodology intro panel: expanded until the user collapses it once, then remember collapsed
  // (per methodology) in localStorage. Expanding again updates the preference so it stays open.
  var METH_INTRO_COLLAPSED_KEY = 'gf-dm-meth-intro-collapsed';
  var methIntroCollapsedById = {};

  function loadMethIntroCollapsed() {
    try {
      var raw = window.localStorage.getItem(METH_INTRO_COLLAPSED_KEY);
      if (!raw) {
        return {};
      }
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch (loadError) {
      return {};
    }
  }

  function storeMethIntroCollapsed() {
    try {
      window.localStorage.setItem(METH_INTRO_COLLAPSED_KEY, JSON.stringify(methIntroCollapsedById));
    } catch (storeError) {
      /* storage unavailable - preference is session-only */
    }
  }

  methIntroCollapsedById = loadMethIntroCollapsed();

  c.isMethIntroCollapsed = function (methodologyId) {
    return !!methIntroCollapsedById[methodologyId];
  };

  c.toggleMethIntro = function (methodologyId) {
    if (methIntroCollapsedById[methodologyId]) {
      delete methIntroCollapsedById[methodologyId];
    } else {
      methIntroCollapsedById[methodologyId] = true;
    }
    storeMethIntroCollapsed();
  };

  c.methIntroParagraphs = function (methodology) {
    if (!methodology || !methodology.description) {
      return [];
    }
    return String(methodology.description).split(/\n\s*\n/).map(function (paragraph) {
      return paragraph.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  };
  var jargonCache = {};
  function jargonHtml(text) {
    if (!text) { return $sce.trustAsHtml(''); }
    var key = (c.showJargon ? '1' : '0') + '|' + text;
    if (jargonCache[key]) { return jargonCache[key]; }
    var html = escapeHtml(text);
    var terms = Object.keys(JARGON);
    if (c.showJargon && terms.length) {
      var re = new RegExp('\\b(' + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b', 'g');
      html = html.replace(re, function (m) {
        return '<span class="jargon-term" data-tip-name="' + escapeHtml(m) + '" data-tip="' + escapeHtml(JARGON[m]) + '">' + escapeHtml(m) + '</span>';
      });
    }
    var trusted = $sce.trustAsHtml(html);
    jargonCache[key] = trusted;
    return trusted;
  }
  c.jargonHtml = jargonHtml;

  // Shows after a short hover delay (skips tooltips for elements the cursor just passes over on
  // its way somewhere else) and, once shown, sits anchored to the hovered element rather than
  // chasing the cursor - both were called out as making the tooltip feel twitchy when sweeping
  // across a row of chips. Jargon terms (.jargon-term) are the one exception - a reader is
  // hovering those specifically to look up a definition, not passing over them on the way to
  // something else, so they show immediately with no delay.
  var TIP_DELAY_MS = 400;
  var tipDelay = null;
  c.tip = { show: false, name: '', text: '', x: 0, y: 0 };
  function positionTipNear(el) {
    var tipEl = document.getElementById('dm-tip');
    if (!tipEl) { return; }
    var r = el.getBoundingClientRect();
    var tr = tipEl.getBoundingClientRect();
    var pad = 10;
    var x = r.left + r.width / 2 - tr.width / 2;
    var y = r.top - tr.height - pad;
    if (y < 8) { y = r.bottom + pad; }
    if (x < 8) { x = 8; }
    if (x + tr.width > window.innerWidth - 8) { x = window.innerWidth - tr.width - 8; }
    c.tip.x = x;
    c.tip.y = y;
  }
  function showTip(el) {
    c.tip.name = el.getAttribute('data-tip-name') || '';
    c.tip.text = el.getAttribute('data-tip') || '';
    c.tip.show = true;
    $timeout(function () { positionTipNear(el); }, 0);
  }
  c.tipMouseOver = function ($event) {
    var el = $event.target.closest && $event.target.closest('[data-tip]');
    if (!el) { return; }
    if (tipDelay) { $timeout.cancel(tipDelay); tipDelay = null; }
    if (el.classList.contains('jargon-term')) {
      showTip(el);
    } else {
      tipDelay = $timeout(function () { showTip(el); }, TIP_DELAY_MS);
    }
  };
  c.tipMouseOut = function ($event) {
    var el = $event.target.closest && $event.target.closest('[data-tip]');
    if (el) {
      if (tipDelay) { $timeout.cancel(tipDelay); tipDelay = null; }
      c.tip.show = false;
    }
  };
  // Clicking a data-tip element (edit-pencil, a reorder/delete button, the theme toggle...) very
  // often re-renders the DOM it's sitting in (ng-if swaps the whole panel to the edit view, a row
  // gets removed, etc.) - the element mouseout was hovering never fires because it's gone, not
  // moved away from, so the tooltip is otherwise left showing, stuck, over whatever's now there.
  c.dismissTip = function () {
    if (tipDelay) { $timeout.cancel(tipDelay); tipDelay = null; }
    c.tip.show = false;
  };

  c.loading = true;
  c.jobTitles = [];
  c.methodologies = [];
  c.methodologyId = null;
  c.subPhaseId = null;
  // Last-opened sub-phase per methodology. Lets Project ↔ GRS (and back) resume where you were,
  // and keeps each methodology's pre-mounted filmstrip on the right phase while it's hidden.
  var methSubPhaseById = {};
  // c.loc (not a c.currentLoc() function) is deliberate: findSubPhase() below builds a fresh
  // {meth, phase, phaseIndex, sp} wrapper object on every call, so binding it directly into the
  // template as a function call (ng-if="c.currentLoc()") never reference-equals its previous
  // value and Angular's digest never stabilizes - $rootScope:infdig after 10 iterations. Compute
  // it once per actual navigation instead, into a plain property the template just reads.
  c.loc = null;
  function refreshLoc() {
    c.loc = c.findSubPhase(c.subPhaseId);
    if (c.loc) {
      c.loc.loeRows = computeLoeRows(c.loc.sp);
      c.loc.taskTableRoles = taskTableRoles(c.loc.sp);
    }
  }

  // One-time migration for seed content authored before participants existed as its own field:
  // any sub-phase with no stored roster gets one derived from whichever job titles its tasks'
  // RACI already reference, so shipping this doesn't silently empty out every existing sub-phase's
  // participant list (and orphan every task role it already had).
  function deriveParticipantIdsFromTasks(sp) {
    var ids = [];
    (sp.tasks || []).forEach(function (t) {
      Object.keys(t.raci || {}).forEach(function (rid) { if (ids.indexOf(rid) < 0) { ids.push(rid); } });
    });
    return ids;
  }
  function backfillParticipants(methodologies) {
    methodologies.forEach(function (m) {
      m.phases.forEach(function (p) {
        p.subPhases.forEach(function (sp) {
          if (!sp.participants || !sp.participants.length) {
            sp.participants = deriveParticipantIdsFromTasks(sp);
          }
        });
      });
    });
  }

  function applyLoadedData(d) {
    c.jobTitles = d.jobTitles || [];
    c.methodologies = d.methodologies || [];
    backfillParticipants(c.methodologies);
    // Legacy localStorage rows may predate sp.icon - fill from the name heuristic once.
    // sid is display-only and not stored on the content table - always derive from position.
    c.methodologies.forEach(function (m) {
      recomputeSids(m);
      m.phases.forEach(function (p) {
        p.subPhases.forEach(function (s) {
          if (!s.icon || !ICON_HTML[s.icon]) { s.icon = subPhaseIconKey(s.name); }
        });
      });
    });
    seedIdCounters();
    JARGON = d.jargon || {};

    if (!c.methodologies.length) {
      c.methodologyId = null;
      c.subPhaseId = null;
      c.loading = false;
      return;
    }

    c.methodologyId = c.methodologies[0].id;
    c.subPhaseId = firstContentSubPhase(curMeth());
    methSubPhaseById[c.methodologyId] = c.subPhaseId;
    refreshLoc();
    refreshWhatsNew();
    refreshJobAids();
    c.loading = false;
    // ?sub=<id>&el=task:<id> - same deep-link contract as the standalone prototype.
    if (!applyDeepLinkFromUrl()) { pushNav(); }
  }

  function curMeth() {
    return c.methodologies.find(function (m) { return m.id === c.methodologyId; });
  }
  // Guarded against structure editing leaving a phase (or every phase) with zero sub-phases -
  // returns null rather than throwing; callers (c.subPhaseId = ...) already tolerate a null
  // location (c.loc stays null, and every template block that reads it is ng-if="c.loc"-gated).
  function firstContentSubPhase(meth) {
    for (var i = 0; i < meth.phases.length; i++) {
      var found = meth.phases[i].subPhases.find(hasContent);
      if (found) { return found.id; }
    }
    for (var j = 0; j < meth.phases.length; j++) {
      if (meth.phases[j].subPhases.length) { return meth.phases[j].subPhases[0].id; }
    }
    return null;
  }
  // Anything an editor can actually add from the edit panel counts as "written" - not just
  // overview/objective/tasks. Otherwise adding participants (or comments, meetings, inputs,
  // deliverables) with nothing else touched leaves the sub-phase stuck behind the "hasn't been
  // written yet" placeholder, hiding the very thing that was just added.
  function hasContent(sp) {
    return !!(sp.overview || sp.objective
      || (sp.tasks && sp.tasks.length) || (sp.participants && sp.participants.length)
      || (sp.comments && sp.comments.length) || (sp.meetings && sp.meetings.length)
      || (sp.inputs && sp.inputs.length) || (sp.deliverables && sp.deliverables.length));
  }
  c.hasContent = hasContent;

  c.jobTitleById = function (id) {
    return c.jobTitles.find(function (r) { return r.id === id; });
  };
  // A CSS var reference (not a literal hex) so the inline style="--c: ..." bindings that consume
  // this stay theme-aware - var(--ink-soft) is itself resolved live wherever --c is actually used
  // (color: var(--c)), tracking whichever theme is active rather than freezing the dark-mode hex.
  c.jobTitleColor = function (id) {
    var jt = c.jobTitleById(id);
    return (jt && jt.external) ? 'var(--ink-soft)' : 'var(--ink-soft)';
  };
  // Fixed display order for job titles everywhere a set of them is shown - anything not listed
  // here (e.g. GRS-only titles) sorts after, in whatever order it was found. External
  // participants (e.g. Customer) always sort to the very end, ahead of that fallback order.
  var JOB_TITLE_ORDER = ['em', 'bpc', 'arch', 'tc', 'ux'];
  c.sortJobTitleIds = function (ids) {
    return ids.slice().sort(function (a, b) {
      var ea = isExternalJobTitle(a), eb = isExternalJobTitle(b);
      if (ea !== eb) { return ea ? 1 : -1; }
      var ia = JOB_TITLE_ORDER.indexOf(a), ib = JOB_TITLE_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  };
  function isExternalJobTitle(id) { var jt = c.jobTitleById(id); return !!(jt && jt.external); }

  c.findSubPhase = function (id) {
    for (var mi = 0; mi < c.methodologies.length; mi++) {
      var m = c.methodologies[mi];
      for (var pi = 0; pi < m.phases.length; pi++) {
        var sp = m.phases[pi].subPhases.find(function (x) { return x.id === id; });
        if (sp) { return { meth: m, phase: m.phases[pi], phaseIndex: pi, sp: sp }; }
      }
    }
    return null;
  };
  // Participants is now a deliberate, user-picked roster (sp.participants, an id array) rather
  // than something inferred from task RACI - this is the read accessor everywhere that roster is
  // displayed (read view legend/RACI table, edit mode's picker + downstream availability lists).
  c.participantsOf = function (sp) {
    return c.sortJobTitleIds(sp.participants || []).map(c.jobTitleById).filter(Boolean);
  };
  // The read-view RACI task table's column set: participants PLUS any job title still holding a
  // RACI letter on a task after being removed from the roster - same "leave it in place, flag it,
  // never silently drop" contract idleParticipants/taskRoleOrphan already use in edit mode. Without
  // this, de-selecting a participant that still has RACI here made their letters vanish from the
  // read table (while the RACI grid view kept showing them) with no trace anything was hidden.
  // Returns plain objects (never the shared c.jobTitles record itself) so the .orphan flag can't
  // leak into other call sites. Precomputed into c.loc.taskTableRoles by refreshLoc(), NOT called
  // as a function from the template - same fresh-array-every-call $rootScope:infdig risk as c.loc
  // and computeLoeRows above (verified independently by hitting the actual error).
  function taskTableRoles(sp) {
    var partIds = sp.participants || [];
    var allIds = partIds.slice();
    (sp.tasks || []).forEach(function (t) {
      Object.keys(t.raci || {}).forEach(function (id) { if (allIds.indexOf(id) < 0) { allIds.push(id); } });
    });
    return c.sortJobTitleIds(allIds).map(function (id) {
      var jt = c.jobTitleById(id);
      if (!jt) { return null; }
      return { id: jt.id, abbr: jt.abbr, name: jt.name, description: jt.description, external: jt.external, orphan: partIds.indexOf(id) < 0 };
    }).filter(Boolean);
  };
  c.participantOn = function (id) { return (c.editSp.participants || []).indexOf(id) >= 0; };
  c.toggleParticipant = function (id) {
    if (!c.editSp.participants) { c.editSp.participants = []; }
    var i = c.editSp.participants.indexOf(id);
    if (i >= 0) { c.editSp.participants.splice(i, 1); } else { c.editSp.participants.push(id); }
  };
  // Participants selected above but not actually given a RACI letter on any task yet - called out
  // in the picker so an editor notices a name they added and then never followed through on.
  c.idleParticipants = function () {
    var used = {};
    (c.editSp.tasks || []).forEach(function (t) {
      Object.keys(t.raci || {}).forEach(function (id) { if (t.raci[id] && t.raci[id].length) { used[id] = true; } });
    });
    return c.participantsOf(c.editSp).filter(function (r) { return !used[r.id]; });
  };
  c.unreadCount = function (sp) {
    return (sp.changelog || []).filter(function (c) { return !c.read; }).length;
  };

  c.curMeth = curMeth;
  c.phaseIndexOfSub = function (subId) {
    var m = curMeth();
    for (var i = 0; i < m.phases.length; i++) {
      if (m.phases[i].subPhases.some(function (s) { return s.id === subId; })) { return i; }
    }
    return 0;
  };
  // Phase index for a specific methodology (active uses c.subPhaseId; hidden uses the remembered
  // last visit). Used by the per-methodology ng-show journey chrome so a hidden meth's filmstrip
  // stays on the right phase instead of tracking the active meth's sub-phase.
  c.phaseIndexInMeth = function (m) {
    if (!m || !m.phases || !m.phases.length) { return 0; }
    var subId = (m.id === c.methodologyId) ? c.subPhaseId : methSubPhaseById[m.id];
    if (!subId) { return 0; }
    for (var i = 0; i < m.phases.length; i++) {
      if (m.phases[i].subPhases.some(function (s) { return s.id === subId; })) { return i; }
    }
    return 0;
  };
  c.activePhaseIndex = function () { return c.phaseIndexOfSub(c.subPhaseId); };
  c.activeColor = function () { return PHASE_COLORS[c.activePhaseIndex() % PHASE_COLORS.length]; };
  c.phaseColor = function (i) { return PHASE_COLORS[i % PHASE_COLORS.length]; };
  c.phaseHasUnread = function (p) { return p.subPhases.some(function (s) { return c.unreadCount(s) > 0; }); };
  c.subPhaseIconPaths = function (sp) { return ICON_HTML[iconKeyFor(sp)]; };

  // read/unread - session-only until SCHEMA's per-user preference I/O lands. Do not persist:
  // dehydrate drops `read`, and a full-table rewrite on every open would buy nothing on instance.
  function unreadEntries(sp) { return (sp.changelog || []).filter(function (c) { return !c.read; }); }
  c.unreadEntries = unreadEntries;
  function markRead(sp) {
    var entries = unreadEntries(sp);
    entries.forEach(function (c) { c.read = true; });
    refreshWhatsNew();
    return entries;
  }
  // Entries just marked read by the most recent openSubPhase - the read-panel shows these once,
  // in a "What changed" banner, so a change you hadn't seen yet doesn't just silently vanish from
  // the unread badge with no trace of what it was.
  c.justRead = [];
  c.anyUnread = function () {
    return c.methodologies.some(function (m) { return m.phases.some(function (p) { return p.subPhases.some(function (s) { return unreadEntries(s).length > 0; }); }); });
  };

  c.view = 'journey';

  /* In-app back/forward: stack of {view, methodologyId, subPhaseId}. Pushed on real
     navigation; goBack/goForward restore without re-pushing (navSilent). */
  var navStack = [];
  var navIndex = -1;
  var navSilent = false;
  function navSnapshot() {
    return { view: c.view, methodologyId: c.methodologyId, subPhaseId: c.subPhaseId };
  }
  function navSame(a, b) {
    return !!(a && b && a.view === b.view && a.methodologyId === b.methodologyId && a.subPhaseId === b.subPhaseId);
  }
  function pushNav() {
    if (navSilent || c.loading) { return; }
    var snap = navSnapshot();
    if (!snap.methodologyId) { return; }
    if (navIndex >= 0 && navSame(navStack[navIndex], snap)) { return; }
    navStack = navStack.slice(0, navIndex + 1);
    navStack.push(snap);
    navIndex = navStack.length - 1;
  }
  function applyNav(snap) {
    navSilent = true;
    c.clearSearch();
    c.view = snap.view;
    c.methodologyId = snap.methodologyId;
    c.subPhaseId = snap.subPhaseId;
    if (snap.methodologyId && snap.subPhaseId) { methSubPhaseById[snap.methodologyId] = snap.subPhaseId; }
    refreshLoc();
    if (c.loc) { c.justRead = markRead(c.loc.sp); }
    if (c.view === 'raci') { refreshRg(); }
    navSilent = false;
  }
  c.canGoBack = function () { return navIndex > 0; };
  c.canGoForward = function () { return navIndex >= 0 && navIndex < navStack.length - 1; };
  function denyWhileEditing() {
    showToast('Finish editing first');
  }
  function isEditing() {
    return !!(c.editMode || c.structureEditMode);
  }
  c.goBack = function () {
    if (isEditing()) { denyWhileEditing(); return; }
    if (!c.canGoBack()) { return; }
    navIndex -= 1;
    applyNav(navStack[navIndex]);
  };
  c.goForward = function () {
    if (isEditing()) { denyWhileEditing(); return; }
    if (!c.canGoForward()) { return; }
    navIndex += 1;
    applyNav(navStack[navIndex]);
  };

  c.setView = function (v) {
    if (isEditing()) { denyWhileEditing(); return; }
    c.view = v;
    if (v === 'raci') { refreshRg(); }
    // Switching tabs dismisses an open search popup without changing where you were browsing.
    c.clearSearch();
    pushNav();
  };
  c.showMethSwitch = function () {
    return (c.view === 'journey' || c.view === 'raci') && c.methodologies.length > 1;
  };
  c.pageTitle = function () {
    if (c.view === 'raci') { return 'RACI'; }
    if (c.view === 'whatsnew') { return "What's New"; }
    if (c.view === 'reference') { return 'Reference'; }
    return 'Methodology';
  };
  c.pageSub = function () {
    if (c.view === 'raci') {
      var raciMethodology = curMeth();
      if (!raciMethodology) {
        return 'Every task and every job title across the engagement. Focus a column to see one role.';
      }
      return 'Every task and every job title in ' + raciMethodology.name + '. Focus a column to see one role across the whole engagement.';
    }
    if (c.view === 'whatsnew') { return 'Every change since you last looked - detected automatically, and cleared as you open the sub-phase it belongs to.'; }
    if (c.view === 'reference') { return 'How to read a RACI, escalation guidance, and every job aid across the methodology in one place.'; }
    var methodology = curMeth();
    if (methodology && methodology.summary) {
      return methodology.summary;
    }
    if (methodology) {
      return 'Playbook for ' + methodology.name + ' engagements.';
    }
    return 'GlideFast\'s playbook for delivering an engagement end to end.';
  };

  c.switchMethodology = function (id) {
    if (isEditing()) { denyWhileEditing(); return; }
    if (id === c.methodologyId) { return; }
    if (c.methodologyId && c.subPhaseId) { methSubPhaseById[c.methodologyId] = c.subPhaseId; }
    c.methodologyId = id;
    var resume = methSubPhaseById[id];
    var loc = resume ? c.findSubPhase(resume) : null;
    if (!loc || loc.meth.id !== id) { resume = firstContentSubPhase(curMeth()); }
    c.openSubPhase(resume);
    if (c.view === 'raci') { refreshRg(); }
  };
  c.selectPhase = function (phaseIndex) {
    if (isEditing()) { return; }
    var p = curMeth().phases[phaseIndex];
    if (!p.subPhases.length) { return; } // structure editing can leave a phase empty - nothing to open
    var written = p.subPhases.find(hasContent);
    c.openSubPhase((written || p.subPhases[0]).id);
  };
  c.openSubPhase = function (id) {
    if (isEditing()) { return; }
    c.subPhaseId = id;
    if (c.methodologyId) { methSubPhaseById[c.methodologyId] = id; }
    refreshLoc();
    c.justRead = c.loc ? markRead(c.loc.sp) : [];
    pushNav();
  };
  // Scroll to a deep-link target inside the open sub-phase panel and pulse it (same treatment as
  // ?sub=&el= in the standalone prototype). elKey is e.g. "task:<id>".
  function focusJumpTarget(elKey) {
    if (!elKey) { return; }
    $timeout(function () {
      var nodes = document.querySelectorAll('.main [data-el]');
      var target = null;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].getAttribute('data-el') === elKey) { target = nodes[i]; break; }
      }
      if (!target) { return; }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('jump-hl');
      void target.offsetWidth;
      target.classList.add('jump-hl');
      $timeout(function () { target.classList.remove('jump-hl'); }, 2000);
    }, 0);
  }
  // Used by RACI / What's New / Search results, which can point at a sub-phase in the OTHER
  // methodology - switches methodology first if needed, then opens + marks read, then returns to
  // the Journey view so the destination is actually visible. Optional elKey (e.g. "task:…")
  // scrolls to and pulses that element inside the sub-phase panel.
  c.jumpTo = function (subId, methId, elKey) {
    if (isEditing()) { return; }
    if (methId && methId !== c.methodologyId) { c.methodologyId = methId; }
    c.view = 'journey';
    c.clearSearch();
    c.openSubPhase(subId);
    focusJumpTarget(elKey);
  };
  function applyDeepLinkFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var subId = params.get('sub');
      if (!subId) { return false; }
      var loc = c.findSubPhase(subId);
      if (!loc) { return false; }
      c.methodologyId = loc.meth.id;
      c.view = 'journey';
      c.openSubPhase(subId);
      focusJumpTarget(params.get('el'));
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ================= Structure editing (methodologies + phases + sub-phases) =================
     Same working-copy model as sub-phase content edit: enter takes a snapshot of the full tree
     (+ selection), mutations run on the live tree without persisting, Save commits, Cancel
     restores the snapshot. addSubPhase is the exception - it commits structure first so the new
     stub can open straight into content edit. */
  c.structureEditUiEnabled = true;
  c.structureEditMode = false;
  c.structureSnapshot = null;
  c.structureNavSnapshot = null;
  function scrollToEditBar() {
    $timeout(function () {
      var bar = document.querySelector('.main .edit-bar');
      if (!bar) { return; }
      // Land exactly at the sticky stick point (not viewport y=0). scrollIntoView({block:'start'})
      // overshoots past where position:sticky pins the bar.
      var stickyTop = parseFloat(window.getComputedStyle(bar).top) || 0;
      var target = Math.max(0, window.scrollY + bar.getBoundingClientRect().top - stickyTop);
      window.scrollTo({ top: target, behavior: 'smooth' });
    }, 0);
  }
  function scrollPageToTop() {
    $timeout(function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }
  function enterStructureEdit() {
    c.structureSnapshot = deepClone(c.methodologies);
    c.structureNavSnapshot = {
      methodologyId: c.methodologyId,
      subPhaseId: c.subPhaseId,
      methSubPhaseById: Object.assign({}, methSubPhaseById),
      rgActivePhases: c.rgActivePhases ? Object.assign({}, c.rgActivePhases) : null
    };
    c.structureEditMode = true;
    scrollToEditBar();
  }
  function exitStructureEdit() {
    c.structureSnapshot = null;
    c.structureNavSnapshot = null;
    c.structureEditMode = false;
  }
  c.toggleStructureEdit = function () {
    if (!c.canEdit) { denyEdit(); return; }
    if (c.editMode) { showToast('Finish editing first'); return; }
    if (c.structureEditMode) { return; }
    enterStructureEdit();
  };
  c.cancelStructureEdit = function () {
    if (c.structureSnapshot) {
      c.methodologies = deepClone(c.structureSnapshot);
      if (c.structureNavSnapshot) {
        c.methodologyId = c.structureNavSnapshot.methodologyId;
        c.subPhaseId = c.structureNavSnapshot.subPhaseId;
        methSubPhaseById = Object.assign({}, c.structureNavSnapshot.methSubPhaseById);
        c.rgActivePhases = c.structureNavSnapshot.rgActivePhases
          ? Object.assign({}, c.structureNavSnapshot.rgActivePhases)
          : null;
      }
    }
    exitStructureEdit();
    refreshLoc();
    refreshWhatsNew();
    refreshJobAids();
    if (c.view === 'raci') { refreshRg(); }
    showToast('Structure edit cancelled - changes reverted');
    scrollPageToTop();
  };
  c.saveStructureEdit = function () {
    c.methodologies.forEach(function (methodology) {
      if (!methodology || !String(methodology.name || '').trim()) { methodology.name = 'Untitled'; }
      (methodology.phases || []).forEach(function (phase) {
        if (!phase || !String(phase.name || '').trim()) { phase.name = 'Untitled'; }
        (phase.subPhases || []).forEach(function (sp) {
          if (!sp || !String(sp.name || '').trim()) { sp.name = 'Untitled'; }
        });
      });
    });
    persistMethodologies().then(function () {
      exitStructureEdit();
      refreshLoc();
      refreshWhatsNew();
      refreshJobAids();
      if (c.view === 'raci') { refreshRg(); }
      pushNav();
      showToast('Structure saved');
      scrollPageToTop();
    });
  };
  c.renameMethodology = function (methodology) {
    if (!methodology || !String(methodology.name || '').trim()) {
      methodology.name = 'Untitled';
    }
  };
  c.addMethodology = function () {
    if (!c.canEdit) { denyEdit(); return; }
    if (c.editMode) { showToast('Finish editing first'); return; }
    if (!c.structureEditMode) { enterStructureEdit(); }
    var methodologyId = 'meth' + (methodologySeq++);
    var phase = {
      id: 'phase' + (phaseSeq++),
      name: 'New Phase',
      order: 1,
      subPhases: []
    };
    var subPhase = DataService.blankSubPhase('subphase' + (subPhaseSeq++), '', 'New Sub-Phase', 1);
    subPhase.changelog.push({
      id: 'c' + (changelogSeq++),
      ts: TODAY,
      text: 'Sub-phase created',
      read: false
    });
    phase.subPhases.push(subPhase);
    var methodology = {
      id: methodologyId,
      name: 'New Methodology',
      order: c.methodologies.length + 1,
      summary: '',
      description: '',
      feedbackUrl: '',
      feedbackLabel: 'Provide Feedback',
      diagramUrl: '',
      phases: [phase]
    };
    c.methodologies.push(methodology);
    recomputeSids(methodology);
    rgEnsureActivePhases();
    c.rgActivePhases[phase.id] = true;
    c.methodologyId = methodologyId;
    methSubPhaseById[methodologyId] = subPhase.id;
    c.subPhaseId = subPhase.id;
    refreshLoc();
    c.justRead = markRead(c.loc.sp);
    refreshWhatsNew();
    if (c.view === 'raci') { refreshRg(); }
    pushNav();
  };
  c.deleteMethodology = function () {
    if (!c.canEdit) { denyEdit(); return; }
    if (c.editMode) { showToast('Finish editing first'); return; }
    if (c.methodologies.length <= 1) {
      showToast('Keep at least one methodology');
      return;
    }
    var methodology = curMeth();
    if (!methodology) {
      return;
    }
    if (!window.confirm('Remove methodology “' + methodology.name + '” and all of its phases from this draft? Cancel structure edit to undo.')) {
      return;
    }
    var index = c.methodologies.findIndex(function (item) { return item.id === methodology.id; });
    if (index < 0) {
      return;
    }
    c.methodologies.splice(index, 1);
    delete methSubPhaseById[methodology.id];
    var next = c.methodologies[Math.max(0, index - 1)] || c.methodologies[0];
    c.methodologyId = next.id;
    c.subPhaseId = methSubPhaseById[next.id] || firstContentSubPhase(next);
    methSubPhaseById[next.id] = c.subPhaseId;
    refreshLoc();
    refreshWhatsNew();
    if (c.view === 'raci') { refreshRg(); }
    pushNav();
  };
  c.renamePhase = function (phase) {
    if (!phase || !String(phase.name || '').trim()) { phase.name = 'Untitled'; }
  };
  c.renameSubPhase = function (sp) {
    if (!sp || !String(sp.name || '').trim()) { sp.name = 'Untitled'; }
  };
  c.addPhase = function () {
    var m = curMeth();
    var phase = { id: 'phase' + (phaseSeq++), name: 'New Phase', order: m.phases.length + 1, subPhases: [] };
    var subPhase = DataService.blankSubPhase('subphase' + (subPhaseSeq++), '', 'New Sub-Phase', 1);
    subPhase.changelog.push({
      id: 'c' + (changelogSeq++),
      ts: TODAY,
      text: 'Sub-phase created',
      read: false
    });
    phase.subPhases.push(subPhase);
    m.phases.push(phase);
    recomputeSids(m);
    rgEnsureActivePhases();
    c.rgActivePhases[phase.id] = true;
    c.subPhaseId = subPhase.id;
    methSubPhaseById[m.id] = subPhase.id;
    refreshLoc();
  };
  // Commits the structure draft first, then lands in the new sub-phase's content editor -
  // selectPhase deliberately skips unwritten sub-phases, so without this the stub would be hard to reach.
  c.addSubPhase = function (phaseIndex) {
    var m = curMeth();
    var p = m.phases[phaseIndex];
    var sp = DataService.blankSubPhase('subphase' + (subPhaseSeq++), '', 'New Sub-Phase', p.subPhases.length + 1);
    sp.changelog.push({ id: 'c' + (changelogSeq++), ts: TODAY, text: 'Sub-phase created', read: false });
    p.subPhases.push(sp);
    recomputeSids(m);
    persistMethodologies().then(function () {
      exitStructureEdit();
      c.subPhaseId = sp.id;
      methSubPhaseById[m.id] = sp.id;
      refreshLoc();
      c.justRead = markRead(c.loc.sp);
      refreshWhatsNew();
      if (c.view === 'raci') { refreshRg(); }
      c.enterEdit();
    });
  };
  c.movePhase = function (index, dir) {
    var m = curMeth();
    var j = dir === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= m.phases.length) { return; }
    var tmp = m.phases[index]; m.phases[index] = m.phases[j]; m.phases[j] = tmp;
    recomputeSids(m);
  };
  c.moveSubPhase = function (phaseIndex, index, dir) {
    var m = curMeth();
    var arr = m.phases[phaseIndex].subPhases;
    var j = dir === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= arr.length) { return; }
    var tmp = arr[index]; arr[index] = arr[j]; arr[j] = tmp;
    recomputeSids(m);
  };
  c.deletePhase = function (index) {
    var m = curMeth();
    if (m.phases.length <= 1) { showToast('A methodology needs at least one phase'); return; }
    var phase = m.phases[index];
    if (!window.confirm('Remove phase “' + phase.name + '” and all ' + phase.subPhases.length + ' of its sub-phases from this draft? Cancel structure edit to undo.')) { return; }
    var removedIds = phase.subPhases.map(function (s) { return s.id; });
    m.phases.splice(index, 1);
    recomputeSids(m);
    delete c.rgActivePhases[phase.id];
    if (removedIds.indexOf(c.subPhaseId) >= 0) {
      c.subPhaseId = firstContentSubPhase(m);
      refreshLoc();
    }
    refreshWhatsNew();
    if (c.view === 'raci') { refreshRg(); }
  };
  c.deleteSubPhase = function (phaseIndex, index) {
    var m = curMeth();
    var arr = m.phases[phaseIndex].subPhases;
    var sp = arr[index];
    if (!window.confirm('Remove sub-phase “' + sp.name + '” from this draft? Cancel structure edit to undo.')) { return; }
    var wasOpen = sp.id === c.subPhaseId;
    arr.splice(index, 1);
    recomputeSids(m);
    if (wasOpen) {
      var next = arr[index] || arr[index - 1];
      if (next) {
        c.subPhaseId = next.id;
        methSubPhaseById[m.id] = next.id;
      } else {
        c.subPhaseId = firstContentSubPhase(m);
        methSubPhaseById[m.id] = c.subPhaseId;
      }
      refreshLoc();
    }
    refreshWhatsNew();
    if (c.view === 'raci') { refreshRg(); }
  };

  // Level of effort - one row for "all participants", or one row per role in byRole mode; only
  // rows with actual text render (mirrors loeReadHtml's filter in the prototype). Computed once
  // into c.loc.loeRows by refreshLoc() below, NOT called as a function from the template - same
  // fresh-object-every-call problem as c.loc itself (see the comment up top).
  // Returns { mode, rows } rather than a flat row list - the two modes render as genuinely
  // different layouts (a single inline .loe-all summary vs. a .loe2 grid of per-role rows with
  // color-coded abbreviations), matching the prototype's loeReadHtml.
  function computeLoeRows(sp) {
    var loe = sp.levelOfEffort || { mode: 'all', all: {}, roles: {} };
    if (loe.mode === 'all') {
      var v = loe.all || {};
      if (!v.text && !v.billable && !v.optional) { return { mode: 'all', rows: [] }; }
      return { mode: 'all', rows: [{ label: 'All participants', text: v.text, billable: v.billable, optional: v.optional }] };
    }
    var rows = c.sortJobTitleIds(Object.keys(loe.roles || {}))
      .map(c.jobTitleById).filter(Boolean)
      .filter(function (r) { return loe.roles[r.id] && loe.roles[r.id].text; })
      .map(function (r) { var v = loe.roles[r.id]; return { label: r.abbr, name: r.name, description: r.description, text: v.text, billable: v.billable, optional: v.optional, color: c.jobTitleColor(r.id) }; });
    return { mode: 'roles', rows: rows };
  }

  c.meetingDisplay = function (m) {
    var scheduledBy = m.scheduledBy ? c.jobTitleById(m.scheduledBy) : null;
    var ledBy = m.ledBy ? c.jobTitleById(m.ledBy) : null;
    var bits = [];
    if (scheduledBy) { bits.push('Scheduled by ' + scheduledBy.abbr); }
    if (ledBy) { bits.push('Led by ' + ledBy.abbr); }
    return { name: m.name, meta: bits.join(' · '), external: m.external };
  };

  c.jobAidScope = function (t, j) {
    if (!j.roles || !j.roles.length) { return []; }
    return c.sortJobTitleIds(j.roles).map(c.jobTitleById).filter(Boolean);
  };

  /* ================= Edit mode =================
     Editing happens on a working COPY (c.editSp), not the live sub-phase - Cancel just discards
     it, Save diffs it against a second copy taken at entry (c.editSnapshot) to auto-generate the
     changelog, then replaces the real sub-phase in place. This is the Angular-native equivalent
     of the prototype's live-edit-plus-snapshot-revert approach: two-way ng-model binding makes
     editing a plain object trivial, so there's no need to mutate live data just to get that. */
  var TODAY = (function () {
    var d = new Date();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  })();
  // Id counters for records created during editing (meetings, job aids, changelog entries, tasks).
  // These MUST start above the highest id already present in seed + persisted data - otherwise a
  // freshly minted 'mt1' collides with a seeded 'mt1', which Angular's ng-repeat rejects
  // ("Duplicates in a repeater") and the edit panel throws. seedIdCounters() (called once data has
  // loaded) scans all existing ids and bumps each counter past the max. Seed task ids are
  // hand-authored strings like 'd2-1-1-t1' (never match the 't'+digits shape addTask mints), so
  // taskSeq only ever needs to out-run OTHER counter-minted task ids from prior sessions.
  // phaseSeq/subPhaseSeq/methodologySeq mint ids for structure edits.
  // 'phase'/'subphase'/'meth' are prefixes no seed id uses (seed ids are hand-authored dash-joined
  // strings like 'd2-initiate'/'d2-1-1'/'delivery2'), so a freshly minted 'phase1' can never collide
  // with one - seedIdCounters() below still bumps past any that a PRIOR session already created
  // and persisted.
  var taskSeq = 1, jaSeq = 1, meetingSeq = 1, changelogSeq = 1000, phaseSeq = 1, subPhaseSeq = 1, methodologySeq = 1;
  function idNum(prefix, id) {
    if (typeof id !== 'string' || id.indexOf(prefix) !== 0) { return 0; }
    var n = parseInt(id.slice(prefix.length), 10);
    return isNaN(n) ? 0 : n;
  }
  function seedIdCounters() {
    c.methodologies.forEach(function (m) {
      methodologySeq = Math.max(methodologySeq, idNum('meth', m.id) + 1);
      m.phases.forEach(function (p) {
        phaseSeq = Math.max(phaseSeq, idNum('phase', p.id) + 1);
        p.subPhases.forEach(function (s) {
          subPhaseSeq = Math.max(subPhaseSeq, idNum('subphase', s.id) + 1);
          (s.meetings || []).forEach(function (x) { meetingSeq = Math.max(meetingSeq, idNum('mt', x.id) + 1); });
          (s.changelog || []).forEach(function (x) { changelogSeq = Math.max(changelogSeq, idNum('c', x.id) + 1); });
          (s.tasks || []).forEach(function (t) { taskSeq = Math.max(taskSeq, idNum('t', t.id) + 1); (t.jobAids || []).forEach(function (j) { jaSeq = Math.max(jaSeq, idNum('ja', j.id) + 1); }); });
        });
      });
    });
  }
  // sid ('1.1', '2.3', ...) is DISPLAY-ONLY and now derived from position rather than
  // hand-authored, so it stays correct through inserts/deletes/reorders instead of drifting -
  // called after every structural mutation to a methodology's phase/sub-phase arrays.
  function recomputeSids(meth) {
    meth.phases.forEach(function (p, pi) {
      p.subPhases.forEach(function (s, si) { s.sid = (pi + 1) + '.' + (si + 1); });
    });
  }
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  c.editMode = false;
  c.editSp = null;
  c.editSnapshot = null;
  c.tmpLoeRole = '';
  c.tmpAddJt = {};

  c.enterEdit = function () {
    if (!c.canEdit) { denyEdit(); return; }
    if (c.structureEditMode) { return; }
    c.editSnapshot = deepClone(c.loc.sp);
    c.editSp = deepClone(c.loc.sp);
    c.tmpLoeRole = '';
    c.tmpAddJt = {};
    c.editMode = true;
    scrollToEditBar();
  };
  c.fcardKey = function ($event, s) {
    if ($event.key === 'Enter' || $event.key === ' ') {
      $event.preventDefault();
      c.openSubPhase(s.id);
    }
  };
  c.cancelEdit = function () {
    c.editMode = false;
    c.editSp = null;
    c.editSnapshot = null;
    showToast('Edit cancelled - changes reverted');
    scrollPageToTop();
  };
  // A job aid's roles list is only meaningful when it's a SUBSET of the task's current RACI
  // roles ("applies to some, not all"). If someone adds/removes RACI roles after a job aid was
  // scoped to specific roles and it now happens to cover every remaining role again, collapse it
  // back to [] (= "all roles") so it doesn't silently drift into a stale, no-longer-partial list.
  function collapseJobAidRoles(sp) {
    (sp.tasks || []).forEach(function (t) {
      var roleIds = c.sortJobTitleIds(Object.keys(t.raci || {}));
      (t.jobAids || []).forEach(function (j) {
        if (Array.isArray(j.roles) && j.roles.length && roleIds.length && roleIds.every(function (rid) { return j.roles.indexOf(rid) >= 0; })) {
          j.roles = [];
        }
      });
    });
  }
  c.saveEdit = function () {
    collapseJobAidRoles(c.editSp);
    var changes = describeChanges(c.editSnapshot, c.editSp);
    var entries = [];
    var idx = c.loc.phase.subPhases.findIndex(function (s) { return s.id === c.editSp.id; });
    var previous = deepClone(c.editSnapshot);
    var toSave = deepClone(c.editSp);
    if (changes.length) {
      if (!toSave.changelog) { toSave.changelog = []; }
      entries = changes.map(function (text) {
        return { id: 'c' + (changelogSeq++), ts: TODAY, text: text, read: false };
      });
      toSave.changelog.unshift.apply(toSave.changelog, entries);
    }
    c.loc.phase.subPhases[idx] = toSave;
    persistMethodologies().then(function () {
      c.editMode = false;
      c.editSp = null;
      c.editSnapshot = null;
      c.justRead = entries;
      refreshLoc();
      refreshWhatsNew();
      refreshJobAids();
      showToast(changes.length ? ('Saved - ' + changes.length + ' change' + (changes.length > 1 ? 's' : '') + ' detected and logged automatically') : 'Saved - no changes detected');
      scrollPageToTop();
    }, function () {
      // Keep the editor open with the user's draft; restore the live tree to match the server.
      c.loc.phase.subPhases[idx] = previous;
      refreshLoc();
    });
  };

  // ---- change diffing (ported from the prototype's describeChanges/diffLoe/diffMeetings/diffRaci) ----
  function truncateText(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  // True only for a PURE reorder: same items, same counts, different positions. Returns false (not
  // "unknown") whenever an add/remove is present, so callers can safely check this after their own
  // add/remove diff came up empty without double-reporting.
  function idSequenceChanged(beforeIds, afterIds) {
    if (beforeIds.length !== afterIds.length) { return false; }
    var sortedB = beforeIds.slice().sort(), sortedA = afterIds.slice().sort();
    for (var i = 0; i < sortedB.length; i++) { if (sortedB[i] !== sortedA[i]) { return false; } }
    for (var i2 = 0; i2 < beforeIds.length; i2++) { if (beforeIds[i2] !== afterIds[i2]) { return true; } }
    return false;
  }
  // Multiset-based (not indexOf-based) so a duplicate string added/removed is counted correctly -
  // e.g. before=['ROM','ROM'], after=['ROM'] correctly reports one removal instead of nothing. Falls
  // back to a reorder entry when every count matches but the position order doesn't.
  function diffListField(before, after, label) {
    before = before || []; after = after || [];
    var out = [];
    var bCount = {}, aCount = {};
    before.forEach(function (x) { bCount[x] = (bCount[x] || 0) + 1; });
    after.forEach(function (x) { aCount[x] = (aCount[x] || 0) + 1; });
    Object.keys(bCount).concat(Object.keys(aCount)).filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (x) {
      var diff = (aCount[x] || 0) - (bCount[x] || 0);
      for (var i = 0; i < diff; i++) { out.push(label + ' added: “' + truncateText(x, 60) + '”'); }
      for (var i2 = 0; i2 < -diff; i2++) { out.push(label + ' removed: “' + truncateText(x, 60) + '”'); }
    });
    if (!out.length && idSequenceChanged(before, after)) { out.push(label + 's reordered'); }
    return out;
  }
  function diffRaci(before, after, taskLabel) {
    before = before || {}; after = after || {};
    var ids = Object.keys(before).concat(Object.keys(after)).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var out = [];
    ids.forEach(function (id) {
      var b = (before[id] || []).join(''), a = (after[id] || []).join('');
      if (b === a) { return; }
      var jt = c.jobTitleById(id), abbr = jt ? jt.abbr : id;
      if (!b) { out.push('RACI added on “' + taskLabel + '”: ' + abbr + ' (' + a + ')'); }
      else if (!a) { out.push('RACI removed on “' + taskLabel + '”: ' + abbr); }
      else { out.push('RACI changed on “' + taskLabel + '”: ' + abbr + ' ' + b + ' → ' + a); }
    });
    return out;
  }
  function loeEntrySame(a, b) {
    a = a || {}; b = b || {};
    return (a.text || '') === (b.text || '') && !!a.billable === !!b.billable && !!a.optional === !!b.optional;
  }
  function diffLoe(before, after) {
    before = before || { mode: 'all', all: {}, roles: {} };
    after = after || { mode: 'all', all: {}, roles: {} };
    var out = [];
    if (before.mode !== after.mode) { out.push(after.mode === 'all' ? 'Level of effort set to one value for all participants' : 'Level of effort broken out per role'); }
    if (after.mode === 'all') {
      if (!loeEntrySame(before.all, after.all)) { out.push('Level of effort updated (all participants)'); }
    } else {
      var ids = Object.keys(before.roles || {}).concat(Object.keys(after.roles || {})).filter(function (v, i, a) { return a.indexOf(v) === i; });
      ids.forEach(function (id) {
        var b = (before.roles || {})[id], a = (after.roles || {})[id];
        if (loeEntrySame(b, a)) { return; }
        // Switching to "Per role" auto-seeds every participant with a default entry (empty text,
        // role-default billable/optional flags) so the picker has rows to show - that seeding alone
        // isn't a user-authored change. Only log it once real text exists on either side; a
        // flag-only difference on an otherwise-empty row is noise, not content.
        if (!(b && b.text) && !(a && a.text)) { return; }
        var jt = c.jobTitleById(id);
        out.push('Level of effort updated for ' + (jt ? jt.abbr : id));
      });
    }
    return out;
  }
  function meetingLabel(m) {
    if (m && m.name) { return m.name; }
    var parts = [];
    var sb = m.scheduledBy && c.jobTitleById(m.scheduledBy);
    var lb = m.ledBy && c.jobTitleById(m.ledBy);
    if (sb) { parts.push('scheduled by ' + sb.abbr); }
    if (lb) { parts.push('led by ' + lb.abbr); }
    return parts.length ? parts.join(', ') : 'meeting';
  }
  function meetingSame(a, b) { return a.name === b.name && a.scheduledBy === b.scheduledBy && a.ledBy === b.ledBy && !!a.external === !!b.external; }
  function diffMeetings(before, after) {
    var out = [];
    var beforeById = {}; (before || []).forEach(function (m) { beforeById[m.id] = m; });
    var afterById = {}; (after || []).forEach(function (m) { afterById[m.id] = m; });
    (after || []).forEach(function (m) {
      if (!beforeById[m.id]) { out.push('Meeting added: “' + meetingLabel(m) + '”'); return; }
      if (!meetingSame(beforeById[m.id], m)) { out.push('Meeting edited: “' + meetingLabel(m) + '”'); }
    });
    (before || []).forEach(function (m) { if (!afterById[m.id]) { out.push('Meeting removed: “' + meetingLabel(m) + '”'); } });
    if (!out.length && idSequenceChanged((before || []).map(function (m) { return m.id; }), (after || []).map(function (m) { return m.id; }))) { out.push('Meetings reordered'); }
    return out;
  }
  function diffParticipants(before, after) {
    before = before || []; after = after || [];
    var out = [];
    after.filter(function (id) { return before.indexOf(id) < 0; }).forEach(function (id) {
      var jt = c.jobTitleById(id); out.push('Participant added: ' + (jt ? jt.abbr : id));
    });
    before.filter(function (id) { return after.indexOf(id) < 0; }).forEach(function (id) {
      var jt = c.jobTitleById(id); out.push('Participant removed: ' + (jt ? jt.abbr : id));
    });
    return out;
  }
  function describeChanges(before, after) {
    var changes = [];
    if (before.name !== after.name) { changes.push('Renamed to “' + after.name + '”'); }
    if (before.overview !== after.overview) { changes.push('Overview edited'); }
    if (before.objective !== after.objective) { changes.push('Objective edited'); }
    changes = changes.concat(diffParticipants(before.participants, after.participants));
    changes = changes.concat(diffLoe(before.levelOfEffort, after.levelOfEffort));
    changes = changes.concat(diffMeetings(before.meetings, after.meetings));
    changes = changes.concat(diffListField(before.inputs, after.inputs, 'Input'));
    changes = changes.concat(diffListField(before.deliverables, after.deliverables, 'Deliverable'));
    changes = changes.concat(diffListField(before.comments, after.comments, 'Comment'));
    var beforeTasks = {}; (before.tasks || []).forEach(function (t) { beforeTasks[t.id] = t; });
    var afterTasks = {}; (after.tasks || []).forEach(function (t) { afterTasks[t.id] = t; });
    (after.tasks || []).forEach(function (t) {
      var label = truncateText(t.text, 50);
      if (!beforeTasks[t.id]) { changes.push('Task added: “' + label + '”'); return; }
      var bt = beforeTasks[t.id];
      if (bt.text !== t.text) { changes.push('Task edited: “' + label + '”'); }
      if (JSON.stringify(bt.jobAids || []) !== JSON.stringify(t.jobAids || [])) { changes.push('Job aids updated on “' + label + '”'); }
      changes = changes.concat(diffRaci(bt.raci, t.raci, label));
    });
    (before.tasks || []).forEach(function (t) { if (!afterTasks[t.id]) { changes.push('Task removed: “' + truncateText(t.text, 50) + '”'); } });
    if (idSequenceChanged((before.tasks || []).map(function (t) { return t.id; }), (after.tasks || []).map(function (t) { return t.id; }))) { changes.push('Tasks reordered'); }
    return changes;
  }

  // ---- list fields: comments / inputs / deliverables (plain string arrays) ----
  c.addListItem = function (kind) { c.editSp[kind].push(''); };
  c.removeListItem = function (kind, i) { c.editSp[kind].splice(i, 1); };
  c.moveListItem = function (kind, i, dir) {
    var arr = c.editSp[kind];
    var j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) { return; }
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  };

  // ---- level of effort ----
  var LOE_ROLE_DEFAULTS = {
    em: { billable: true, optional: false }, bpc: { billable: true, optional: false },
    arch: { billable: true, optional: false }, tc: { billable: true, optional: false }, ux: { billable: true, optional: false },
    ae: { billable: false, optional: false }, sa: { billable: false, optional: false },
    es: { billable: false, optional: true }
  };
  function defaultLoeEntry(roleId) {
    var d = LOE_ROLE_DEFAULTS[roleId] || { billable: false, optional: false };
    return { text: '', billable: d.billable, optional: d.optional };
  }
  c.setLoeMode = function (mode) {
    c.editSp.levelOfEffort.mode = mode;
    if (mode === 'byRole' && !Object.keys(c.editSp.levelOfEffort.roles || {}).length) {
      if (!c.editSp.levelOfEffort.roles) { c.editSp.levelOfEffort.roles = {}; }
      c.participantsOf(c.editSp).filter(function (r) { return !r.external; }).forEach(function (r) {
        c.editSp.levelOfEffort.roles[r.id] = defaultLoeEntry(r.id);
      });
    }
  };
  // Only sub-phase participants are offered here - matches taskAvailableRoles below and the
  // meeting scheduled/led-by pickers, all three now scoped to the same explicit roster instead of
  // the full job title list.
  c.loeAvailableRoles = function () {
    var used = Object.keys(c.editSp.levelOfEffort.roles || {});
    return c.participantsOf(c.editSp).filter(function (r) { return !r.external && used.indexOf(r.id) < 0; });
  };
  c.addLoeRole = function () {
    if (!c.tmpLoeRole) { return; }
    if (!c.editSp.levelOfEffort.roles) { c.editSp.levelOfEffort.roles = {}; }
    c.editSp.levelOfEffort.roles[c.tmpLoeRole] = defaultLoeEntry(c.tmpLoeRole);
    c.tmpLoeRole = '';
  };
  c.removeLoeRole = function (roleId) { delete c.editSp.levelOfEffort.roles[roleId]; };
  c.setLoeFlag = function (entry, val) {
    if (val === 'optional') { entry.optional = true; entry.billable = false; }
    else if (val === 'mandatory') { entry.optional = false; }
    else if (val === 'billable' && !entry.optional) { entry.billable = true; }
    else if (val === 'nonbillable' && !entry.optional) { entry.billable = false; }
  };
  // True once a role that had a per-role LOE row stops being a participant (removed after the
  // fact) - the row itself is left alone (data isn't silently dropped), just flagged.
  c.loeRoleOrphan = function (roleId) { return (c.editSp.participants || []).indexOf(roleId) < 0; };
  c.loeRoleRows = function () {
    return c.sortJobTitleIds(Object.keys(c.editSp.levelOfEffort.roles || {})).map(c.jobTitleById).filter(Boolean);
  };

  // ---- meetings ----
  c.addMeeting = function () { c.editSp.meetings.push({ id: 'mt' + (meetingSeq++), name: '', scheduledBy: '', ledBy: '', external: false }); };
  c.removeMeeting = function (i) { c.editSp.meetings.splice(i, 1); };
  c.moveMeeting = function (i, dir) {
    var arr = c.editSp.meetings;
    var j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) { return; }
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  };
  c.internalRoles = function () {
    return c.participantsOf(c.editSp).filter(function (r) { return !r.external; });
  };
  // Assignment (a task RACI letter, an LOE row, meeting scheduled/led-by) referencing a job title
  // that's since been unselected from Participants above - left in place rather than silently
  // dropped, but flagged wherever it's shown so it doesn't read as a live option.
  c.meetingPersonOrphan = function (roleId) {
    return !!roleId && (c.editSp.participants || []).indexOf(roleId) < 0;
  };

  // ---- tasks ----
  c.addTask = function () { c.editSp.tasks.push({ id: 't' + (taskSeq++), order: c.editSp.tasks.length + 1, text: '', jobAids: [], raci: {} }); };
  c.removeTask = function (i) { c.editSp.tasks.splice(i, 1); };
  c.moveTask = function (i, dir) {
    var arr = c.editSp.tasks;
    var j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) { return; }
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    arr.forEach(function (t, k) { t.order = k + 1; });
  };
  c.taskRaciRoles = function (t) { return c.sortJobTitleIds(Object.keys(t.raci || {})).map(c.jobTitleById).filter(Boolean); };
  c.taskRoleOrphan = function (roleId) { return (c.editSp.participants || []).indexOf(roleId) < 0; };
  var CORE_TEAM = ['em', 'bpc', 'arch', 'tc'];
  c.taskAvailableRoles = function (t) {
    var used = Object.keys(t.raci || {});
    return c.participantsOf(c.editSp).filter(function (r) { return used.indexOf(r.id) < 0; });
  };
  c.taskCoreTeamMissing = function (t) {
    var used = Object.keys(t.raci || {});
    var participating = c.editSp.participants || [];
    return CORE_TEAM.some(function (id) { return participating.indexOf(id) >= 0 && used.indexOf(id) < 0; });
  };
  c.toggleRaci = function (t, roleId, letter) {
    var arr = t.raci[roleId] || (t.raci[roleId] = []);
    var i = arr.indexOf(letter);
    if (i >= 0) { arr.splice(i, 1); } else { arr.push(letter); arr.sort(function (a, b) { return c.raciLetters.indexOf(a) - c.raciLetters.indexOf(b); }); }
  };
  c.removeTaskRole = function (t, roleId) { delete t.raci[roleId]; };
  c.addTaskRole = function (t, roleId) {
    if (!roleId) { return; }
    if (roleId === '__core__') {
      var participating = c.editSp.participants || [];
      CORE_TEAM.forEach(function (id) { if (participating.indexOf(id) >= 0 && !t.raci[id]) { t.raci[id] = []; } });
      return;
    }
    if (!t.raci[roleId]) { t.raci[roleId] = []; }
  };
  c.addJobAid = function (t) { if (!Array.isArray(t.jobAids)) { t.jobAids = []; } t.jobAids.push({ id: 'ja' + (jaSeq++), url: '', roles: [] }); };
  c.removeJobAid = function (t, i) { t.jobAids.splice(i, 1); };
  // toggle relative to the DISPLAYED state (all roles selected when j.roles is empty), not the
  // raw array - clicking one role while "all" is showing should exclude just that one, not
  // collapse the scope down to only the one clicked. Collapses back to [] ("all") if every role
  // ends up selected again.
  c.toggleJobAidRole = function (t, j, roleId) {
    var roleIds = c.sortJobTitleIds(Object.keys(t.raci || {}));
    var arr = (j.roles && j.roles.length) ? j.roles.slice() : roleIds.slice();
    var i = arr.indexOf(roleId);
    if (i >= 0) { arr.splice(i, 1); } else { arr.push(roleId); }
    j.roles = (roleIds.length && roleIds.every(function (r) { return arr.indexOf(r) >= 0; })) ? [] : arr;
  };
  c.jobAidRoleOn = function (t, j, roleId) {
    return !j.roles || !j.roles.length || j.roles.indexOf(roleId) >= 0;
  };

  /* ================= RACI grid =================
     Same rule as c.loc up top: c.rg is a plain property, recomputed by refreshRg() on every
     state change, NEVER a function called from the template. rgGroups()/rgCounts() etc. used to
     do exactly that (verified independently - not just by analogy - by hitting the actual
     $rootScope:infdig error), each building a fresh object/array per call. */
  c.raciMode = 'grid';
  c.rgActivePhases = null;
  // Grid column focus and By Role job picker keep separate selections so switching modes
  // doesn't wipe or inherit the other view's focus.
  c.rgGridFocusJob = null;
  c.rgByRoleFocusJob = null;
  c.rgHoverCol = null;
  c.rg = { ids: [], counts: {}, groups: [], byRoleGroups: [] };

  // Keyed by phase ID, not name - a name key meant renaming a phase silently reset its RACI filter
  // (the old name's entry just went stale) and two same-named phases would collapse into one chip.
  function rgEnsureActivePhases() {
    var ids = curMeth().phases.map(function (p) { return p.id; });
    if (!c.rgActivePhases || Object.keys(c.rgActivePhases).some(function (id) { return ids.indexOf(id) < 0; })) {
      c.rgActivePhases = {};
      ids.forEach(function (id) { c.rgActivePhases[id] = true; });
    }
  }
  function refreshRg() {
    rgEnsureActivePhases();
    var ids = [];
    curMeth().phases.forEach(function (p) { p.subPhases.forEach(function (s) {
      if (hasContent(s)) { s.tasks.forEach(function (t) { Object.keys(t.raci || {}).forEach(function (id) { if (ids.indexOf(id) < 0) { ids.push(id); } }); }); }
    }); });
    ids = c.sortJobTitleIds(ids);
    if (c.rgGridFocusJob && ids.indexOf(c.rgGridFocusJob) < 0) {
      c.rgGridFocusJob = null;
    }
    // By Role mode always shows *someone's* tasks rather than an empty "no job titles" state -
    // auto-focus the first job title the first time this mode is opened, and re-validate the
    // focus any time it becomes stale (e.g. after switching methodology to one where that id
    // has no tasks).
    if (c.raciMode === 'byrole' && (!c.rgByRoleFocusJob || ids.indexOf(c.rgByRoleFocusJob) < 0)) {
      c.rgByRoleFocusJob = ids[0] || null;
    }

    var counts = {};
    curMeth().phases.forEach(function (p) {
      if (!c.rgActivePhases[p.id]) { return; }
      p.subPhases.forEach(function (s) { if (hasContent(s)) { s.tasks.forEach(function (t) { Object.keys(t.raci || {}).forEach(function (id) { counts[id] = (counts[id] || 0) + t.raci[id].length; }); }); } });
    });

    var groups = [];
    var byRoleGroups = [];
    curMeth().phases.forEach(function (p, pi) {
      if (!c.rgActivePhases[p.id]) { return; }
      var color = PHASE_COLORS[pi % PHASE_COLORS.length];
      p.subPhases.filter(hasContent).forEach(function (s) {
        var rows = c.rgGridFocusJob ? s.tasks.filter(function (t) { return t.raci[c.rgGridFocusJob]; }) : s.tasks;
        if (rows.length) {
          groups.push({ phase: p, sp: s, color: color, rows: rows.map(function (t) {
            return { task: t };
          }) });
        }
        if (c.rgByRoleFocusJob) {
          var matched = s.tasks.filter(function (t) { return t.raci[c.rgByRoleFocusJob]; });
          if (matched.length) { byRoleGroups.push({ phase: p, sp: s, color: color, tasks: matched }); }
        }
      });
    });
    c.rg = { ids: ids, counts: counts, groups: groups, byRoleGroups: byRoleGroups };
  }
  c.rgTogglePhase = function (id) { rgEnsureActivePhases(); c.rgActivePhases[id] = !c.rgActivePhases[id]; refreshRg(); };
  c.rgToggleCol = function (id) { c.rgGridFocusJob = (c.rgGridFocusJob === id) ? null : id; refreshRg(); };
  c.rgClearFocus = function () { c.rgGridFocusJob = null; refreshRg(); };
  c.rgSetMode = function (mode) { c.raciMode = mode; refreshRg(); };
  c.rgSelectByRole = function (id) { c.rgByRoleFocusJob = id; refreshRg(); };

  /* ================= What's New =================
     c.whatsNew is a stable property, recomputed by refreshWhatsNew() whenever read/unread state
     actually changes (load, openSubPhase's markRead, saveEdit's new entries) - NOT a function
     bound into ng-repeat. Same fresh-array-of-fresh-objects trap as c.loc/c.rg above. */
  c.whatsNew = [];
  function refreshWhatsNew() {
    var items = [];
    c.methodologies.forEach(function (m) {
      m.phases.forEach(function (p, pi) {
        p.subPhases.forEach(function (s) {
          unreadEntries(s).forEach(function (entry) { items.push({ m: m, p: p, pi: pi, s: s, entry: entry, color: PHASE_COLORS[pi % PHASE_COLORS.length] }); });
        });
      });
    });
    items.sort(function (a, b) { return Date.parse(b.entry.ts) - Date.parse(a.entry.ts); });
    c.whatsNew = items;
  }
  c.fmtDate = function (d) {
    var parts = String(d).split('-');
    if (parts.length !== 3) { return d; }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[+parts[1] - 1] + ' ' + (+parts[2]) + ', ' + parts[0];
  };
  c.daysAgo = function (dateStr) { return Math.round((Date.parse(TODAY) - Date.parse(dateStr)) / 86400000); };

  /* ================= Reference =================
     c.jobAids - same treatment; only changes when tasks/job aids are edited (saveEdit). */
  c.jobAids = [];
  function refreshJobAids() {
    var aids = [];
    c.methodologies.forEach(function (m) { m.phases.forEach(function (p) { p.subPhases.forEach(function (s) {
      (s.tasks || []).forEach(function (t) { (t.jobAids || []).forEach(function (j) {
        if (j.url) { aids.push({ m: m, p: p, s: s, t: t, j: j, scope: c.jobAidScope(t, j) }); }
      }); });
    }); }); });
    c.jobAids = aids;
  }

  /* ================= Search =================
     Fixed overlay modal - the header search input and theme toggle never move. Opening/closing
     without picking a result leaves c.view (and scroll position under the dimmed page) alone.
     c.searchResultsList is rebuilt only by c.runSearch() (ng-change), not every digest. */
  // $sce.trustAsHtml is safe here because each result's snippetHtml is trusted once per search,
  // not once per digest cycle.
  function makeSnippet(hay, q) {
    var clean = hay.replace(/\n+/g, ' · ');
    var i = clean.toLowerCase().indexOf(q);
    if (i < 0) { return $sce.trustAsHtml(escapeHtml(clean.slice(0, 120))); }
    var start = Math.max(0, i - 40);
    var seg = clean.slice(start, i + q.length + 60);
    var html = (start > 0 ? '…' : '') + escapeHtml(seg.slice(0, i - start)) + '<mark>' + escapeHtml(seg.slice(i - start, i - start + q.length)) + '</mark>' + escapeHtml(seg.slice(i - start + q.length)) + '…';
    return $sce.trustAsHtml(html);
  }

  c.searchQuery = '';
  c.searchResultsList = [];
  c.searchOpen = function () { return !!(c.searchQuery || '').trim(); };
  c.clearSearch = function () {
    c.searchQuery = '';
    c.searchResultsList = [];
  };
  c.searchKeydown = function ($event) {
    if ($event.key === 'Escape') {
      c.clearSearch();
      ($event.target && $event.target.blur && $event.target.blur());
    }
  };
  c.pickSearchResult = function (r) {
    c.jumpTo(r.s.id, r.m.id);
  };
  c.runSearch = function () {
    var trimmed = (c.searchQuery || '').trim();
    if (trimmed.length >= 1 && isEditing()) {
      denyWhileEditing();
      c.clearSearch();
      return;
    }
    var q = trimmed.toLowerCase();
    if (q.length < 2) { c.searchResultsList = []; return; }
    var results = [];
    c.methodologies.forEach(function (m) { m.phases.forEach(function (p) { p.subPhases.forEach(function (s) {
      var hay = [s.name, s.overview, s.objective].concat(s.comments || [], s.inputs || [], s.deliverables || [], (s.tasks || []).map(function (t) { return t.text; })).join('  ');
      if (hay.toLowerCase().indexOf(q) >= 0) {
        results.push({ m: m, p: p, s: s, snippetHtml: makeSnippet(hay, q) });
      }
    }); }); });
    c.searchResultsList = results;
  };

  // Bootstrap after all helpers/counters exist. Harness hydrates sync (seed + localStorage) so the
  // first paint isn't Loading… → jump; instance loads stay async via the server.
  if (c.server) {
    DataService.getData().then(applyLoadedData, function (err) {
      showToast((err && err.error) ? err.error : 'Could not load content.');
      c.loading = false;
    });
  } else {
    applyLoadedData(DataService.readLocalData());
  }
}]);
