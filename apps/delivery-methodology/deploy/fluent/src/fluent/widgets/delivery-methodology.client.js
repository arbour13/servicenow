api.controller = function (
    DataService, $timeout, $q, ThemeService,
    RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService,
    IdSeqService, IconService, TipService, JargonService, ContentEditService, StructureEditService
  ) {
  'use strict';
  var c = this;

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

  c.raciLetters = ['R', 'A', 'C', 'I'];
  c.raciNames = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };
  c.raciTip = function (letters) {
    if (!letters || !letters.length) { return ''; }
    return letters.map(function (l) { return c.raciNames[l]; }).join(' / ');
  };
  c.raciHex = { R: '#01cc52', A: '#e5c20b', C: '#3ec2f8', I: '#bdc2cb' };

  c.showJargon = false;
  c.jargonHtml = function (text) {
    return JargonService.jargonHtml(text, c.showJargon);
  };

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

  // Sub-phase Overview + Objective share one collapse (same pattern as About). Preference is
  // per sub-phase so collapsing Kickoff does not hide IPKT's briefing.
  var SP_BRIEF_COLLAPSED_KEY = 'gf-dm-sp-brief-collapsed';
  var spBriefCollapsedById = {};

  function loadSpBriefCollapsed() {
    try {
      var raw = window.localStorage.getItem(SP_BRIEF_COLLAPSED_KEY);
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

  function storeSpBriefCollapsed() {
    try {
      window.localStorage.setItem(SP_BRIEF_COLLAPSED_KEY, JSON.stringify(spBriefCollapsedById));
    } catch (storeError) {
      /* storage unavailable - preference is session-only */
    }
  }

  spBriefCollapsedById = loadSpBriefCollapsed();

  c.hasSpBrief = function (subPhase) {
    return !!(subPhase && (subPhase.overview || subPhase.objective));
  };

  c.isSpBriefCollapsed = function (subPhaseId) {
    return !!spBriefCollapsedById[subPhaseId];
  };

  c.toggleSpBrief = function (subPhaseId) {
    if (spBriefCollapsedById[subPhaseId]) {
      delete spBriefCollapsedById[subPhaseId];
    } else {
      spBriefCollapsedById[subPhaseId] = true;
    }
    storeSpBriefCollapsed();
  };
  c.tip = TipService.tip;
  c.tipMouseOver = function ($event) { TipService.tipMouseOver($event); };
  c.tipMouseOut = function ($event) { TipService.tipMouseOut($event); };
  c.dismissTip = function () { TipService.dismissTip(); };

  c.loading = true;
  c.jobTitles = [];
  c.methodologies = [];
  c.methodologyId = null;
  c.subPhaseId = null;
  // Last-opened sub-phase per methodology lives on NavigationService (resume map).
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
      IdSeqService.recomputeSids(m);
      m.phases.forEach(function (p) {
        p.subPhases.forEach(function (s) {
          IconService.ensureIcon(s);
        });
      });
    });
    IdSeqService.seedFromMethodologies(c.methodologies);
    JargonService.setGlossary(d.jargon || {});

    if (!c.methodologies.length) {
      c.methodologyId = null;
      c.subPhaseId = null;
      c.loading = false;
      return;
    }

    c.methodologyId = c.methodologies[0].id;
    c.subPhaseId = firstContentSubPhase(curMeth());
    NavigationService.remember(c.methodologyId, c.subPhaseId);
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
  c.participantOn = function (id) { return ContentEditService.participantOn(id); };
  c.toggleParticipant = function (id) { ContentEditService.toggleParticipant(id); };
  c.idleParticipants = function () { return ContentEditService.idleParticipants(); };
  c.unreadCount = function (sp) { return WhatsNewService.unreadCount(sp); };
  c.unreadEntries = function (sp) { return WhatsNewService.unreadEntries(sp); };
  function markRead(sp) { return WhatsNewService.markRead(sp, c.methodologies); }
  // Entries just marked read by the most recent openSubPhase - the read-panel shows these once.
  c.justRead = [];
  c.anyUnread = function () { return WhatsNewService.anyUnread(c.methodologies); };
  c.phaseHasUnread = function (p) { return WhatsNewService.phaseHasUnread(p); };

  c.curMeth = curMeth;
  c.phaseIndexOfSub = function (subId) {
    var m = curMeth();
    for (var i = 0; i < m.phases.length; i++) {
      if (m.phases[i].subPhases.some(function (s) { return s.id === subId; })) { return i; }
    }
    return 0;
  };
  // Phase index for a specific methodology (active uses c.subPhaseId; hidden uses the remembered
  // last visit). Used by the per-methodology ng-show methodology chrome so a hidden meth's filmstrip
  // stays on the right phase instead of tracking the active meth's sub-phase.
  c.phaseIndexInMeth = function (m) {
    if (!m || !m.phases || !m.phases.length) { return 0; }
    var subId = (m.id === c.methodologyId) ? c.subPhaseId : NavigationService.remembered(m.id);
    if (!subId) { return 0; }
    for (var i = 0; i < m.phases.length; i++) {
      if (m.phases[i].subPhases.some(function (s) { return s.id === subId; })) { return i; }
    }
    return 0;
  };
  c.activePhaseIndex = function () { return c.phaseIndexOfSub(c.subPhaseId); };
  c.activeColor = function () { return PHASE_COLORS[c.activePhaseIndex() % PHASE_COLORS.length]; };
  c.phaseColor = function (i) { return PHASE_COLORS[i % PHASE_COLORS.length]; };
  c.subPhaseIconPaths = function (sp) { return IconService.pathsFor(sp); };

  c.view = 'methodology';

  function denyWhileEditing() {
    showToast('Finish editing first');
  }
  function isEditing() {
    return !!(ContentEditService.isEditing() || StructureEditService.isEditing());
  }
  function syncSearch() {
    var state = SearchService.readState();
    c.searchResultsList = state.searchResultsList;
    c.searchQuery = state.searchQuery;
  }
  function syncWhatsNew() {
    c.whatsNew = WhatsNewService.readState().whatsNew;
  }
  function syncJobAids() {
    c.jobAids = ReferenceService.readState().jobAids;
  }
  function syncRg() {
    var state = RaciGridService.readState();
    c.raciMode = state.raciMode;
    c.rgActivePhases = state.rgActivePhases;
    c.rgGridFocusJob = state.rgGridFocusJob;
    c.rgByRoleFocusJob = state.rgByRoleFocusJob;
    c.rg = state.rg;
  }
  function rgContext() {
    return { methodology: curMeth(), sortJobTitleIds: c.sortJobTitleIds, hasContent: hasContent };
  }
  function refreshRg() {
    RaciGridService.refresh(rgContext());
    syncRg();
  }
  function refreshWhatsNew() {
    WhatsNewService.refresh(c.methodologies);
    syncWhatsNew();
  }
  function refreshJobAids() {
    ReferenceService.refresh(c.methodologies, c.sortJobTitleIds, c.jobTitleById);
    syncJobAids();
  }
  function clearSearch() {
    SearchService.clear();
    syncSearch();
  }
  function pushNav() { NavigationService.push(); }
  function applyDeepLinkFromUrl() { return NavigationService.applyDeepLinkFromUrl(); }

  c.canGoBack = function () { return NavigationService.canGoBack(); };
  c.canGoForward = function () { return NavigationService.canGoForward(); };
  c.goBack = function () { NavigationService.goBack(); };
  c.goForward = function () { NavigationService.goForward(); };
  c.setView = function (v) { NavigationService.setView(v); };
  c.switchMethodology = function (id) { NavigationService.switchMethodology(id); };
  c.selectPhase = function (phaseIndex) { NavigationService.selectPhase(phaseIndex); };
  c.openSubPhase = function (id) { NavigationService.openSubPhase(id); };
  c.jumpTo = function (subId, methId, elKey) { NavigationService.jumpTo(subId, methId, elKey); };
  c.clearSearch = clearSearch;

  c.showMethSwitch = function () {
    return (c.view === 'methodology' || c.view === 'raci') && c.methodologies.length > 1;
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

  c.structureEditUiEnabled = true;
  c.structureEditMode = false;
  c.structureSnapshot = null;
  c.structureNavSnapshot = null;
  function scrollToEditBar() {
    $timeout(function () {
      var bar = document.querySelector('.main .edit-bar');
      if (!bar) { return; }
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
  function syncStructure() {
    var structureState = StructureEditService.readState();
    c.structureEditUiEnabled = structureState.structureEditUiEnabled;
    c.structureEditMode = structureState.structureEditMode;
    c.structureSnapshot = structureState.structureSnapshot;
    c.structureNavSnapshot = structureState.structureNavSnapshot;
  }
  syncStructure();
  c.toggleStructureEdit = function () {
    StructureEditService.toggleStructureEdit();
    syncStructure();
  };
  c.cancelStructureEdit = function () {
    StructureEditService.cancelStructureEdit();
    syncStructure();
  };
  c.saveStructureEdit = function () { StructureEditService.saveStructureEdit(); };
  c.renameMethodology = function (methodology) { StructureEditService.renameMethodology(methodology); };
  c.addMethodology = function () {
    StructureEditService.addMethodology();
    syncStructure();
  };
  c.deleteMethodology = function () { StructureEditService.deleteMethodology(); };
  c.renamePhase = function (phase) { StructureEditService.renamePhase(phase); };
  c.renameSubPhase = function (sp) { StructureEditService.renameSubPhase(sp); };
  c.addPhase = function () { StructureEditService.addPhase(); };
  c.addSubPhase = function (phaseIndex) { StructureEditService.addSubPhase(phaseIndex); };
  c.movePhase = function (index, dir) { StructureEditService.movePhase(index, dir); };
  c.moveSubPhase = function (phaseIndex, index, dir) {
    StructureEditService.moveSubPhase(phaseIndex, index, dir);
  };
  c.deletePhase = function (index) { StructureEditService.deletePhase(index); };
  c.deleteSubPhase = function (phaseIndex, index) {
    StructureEditService.deleteSubPhase(phaseIndex, index);
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
    return ReferenceService.jobAidScope(t, j, c.sortJobTitleIds, c.jobTitleById);
  };

  c.editMode = false;
  c.editSp = null;
  c.editSnapshot = null;
  c.tmpLoeRole = '';
  c.tmpAddJt = {};

  function syncEdit() {
    var editState = ContentEditService.readState();
    c.editMode = editState.editMode;
    c.editSp = editState.editSp;
    c.editSnapshot = editState.editSnapshot;
    c.tmpAddJt = editState.tmpAddJt;
  }
  syncEdit();

  c.enterEdit = function () {
    ContentEditService.enterEdit();
    syncEdit();
  };
  c.fcardKey = function ($event, s) {
    if ($event.key === 'Enter' || $event.key === ' ') {
      $event.preventDefault();
      c.openSubPhase(s.id);
    }
  };
  c.cancelEdit = function () {
    ContentEditService.cancelEdit();
    syncEdit();
  };
  c.saveEdit = function () {
    ContentEditService.saveEdit();
  };
  c.addListItem = function (kind) { ContentEditService.addListItem(kind); };
  c.removeListItem = function (kind, index) { ContentEditService.removeListItem(kind, index); };
  c.moveListItem = function (kind, index, dir) { ContentEditService.moveListItem(kind, index, dir); };
  c.setLoeMode = function (mode) { ContentEditService.setLoeMode(mode); };
  c.loeAvailableRoles = function () { return ContentEditService.loeAvailableRoles(); };
  c.addLoeRole = function () { ContentEditService.addLoeRole(); };
  c.removeLoeRole = function (roleId) { ContentEditService.removeLoeRole(roleId); };
  c.setLoeFlag = function (entry, value) { ContentEditService.setLoeFlag(entry, value); };
  c.loeRoleOrphan = function (roleId) { return ContentEditService.loeRoleOrphan(roleId); };
  c.loeRoleRows = function () { return ContentEditService.loeRoleRows(); };
  c.addMeeting = function () { ContentEditService.addMeeting(); };
  c.removeMeeting = function (index) { ContentEditService.removeMeeting(index); };
  c.moveMeeting = function (index, dir) { ContentEditService.moveMeeting(index, dir); };
  c.internalRoles = function () { return ContentEditService.internalRoles(); };
  c.meetingPersonOrphan = function (roleId) { return ContentEditService.meetingPersonOrphan(roleId); };
  c.addTask = function () { ContentEditService.addTask(); };
  c.removeTask = function (index) { ContentEditService.removeTask(index); };
  c.moveTask = function (index, dir) { ContentEditService.moveTask(index, dir); };
  c.taskRaciRoles = function (task) { return ContentEditService.taskRaciRoles(task); };
  c.taskRoleOrphan = function (roleId) { return ContentEditService.taskRoleOrphan(roleId); };
  c.taskAvailableRoles = function (task) { return ContentEditService.taskAvailableRoles(task); };
  c.taskCoreTeamMissing = function (task) { return ContentEditService.taskCoreTeamMissing(task); };
  c.toggleRaci = function (task, roleId, letter) { ContentEditService.toggleRaci(task, roleId, letter); };
  c.removeTaskRole = function (task, roleId) { ContentEditService.removeTaskRole(task, roleId); };
  c.addTaskRole = function (task, roleId) { ContentEditService.addTaskRole(task, roleId); };
  c.addJobAid = function (task) { ContentEditService.addJobAid(task); };
  c.removeJobAid = function (task, index) { ContentEditService.removeJobAid(task, index); };
  c.toggleJobAidRole = function (task, jobAid, roleId) {
    ContentEditService.toggleJobAidRole(task, jobAid, roleId);
  };
  c.jobAidRoleOn = function (task, jobAid, roleId) {
    return ContentEditService.jobAidRoleOn(task, jobAid, roleId);
  };

  /* ================= RACI grid =================
     Stable c.rg mirror - RaciGridService owns the engine; syncRg copies into template state. */
  c.rgHoverCol = null;
  c.raciMode = 'grid';
  c.rgActivePhases = null;
  c.rgGridFocusJob = null;
  c.rgByRoleFocusJob = null;
  c.rg = { ids: [], counts: {}, groups: [], byRoleGroups: [] };
  syncRg();

  c.rgTogglePhase = function (id) { RaciGridService.togglePhase(id, rgContext()); syncRg(); };
  c.rgToggleCol = function (id) { RaciGridService.toggleCol(id, rgContext()); syncRg(); };
  c.rgClearFocus = function () { RaciGridService.clearFocus(rgContext()); syncRg(); };
  c.rgSetMode = function (mode) { RaciGridService.setMode(mode, rgContext()); syncRg(); };
  c.rgSelectByRole = function (id) { RaciGridService.selectByRole(id, rgContext()); syncRg(); };

  /* ================= What's New / Reference / Search ================= */
  c.whatsNew = [];
  c.fmtDate = function (d) { return WhatsNewService.fmtDate(d); };
  c.daysAgo = function (dateStr) { return WhatsNewService.daysAgo(dateStr); };

  c.jobAids = [];

  c.searchQuery = '';
  c.searchResultsList = [];
  c.searchOpen = function () { return SearchService.isOpen() || !!(c.searchQuery || '').trim(); };
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
    SearchService.setQuery(c.searchQuery);
    SearchService.run(c.methodologies, { isEditing: isEditing, onDenyEditing: denyWhileEditing });
    syncSearch();
  };

  ContentEditService.bind({
    canEdit: function () { return c.canEdit; },
    denyEdit: denyEdit,
    showToast: showToast,
    isStructureEditing: StructureEditService.isEditing,
    getLoc: function () { return c.loc; },
    persistMethodologies: persistMethodologies,
    jobTitleById: c.jobTitleById,
    sortJobTitleIds: c.sortJobTitleIds,
    participantsOf: c.participantsOf,
    raciLetters: function () { return c.raciLetters; },
    scrollToEditBar: scrollToEditBar,
    scrollPageToTop: scrollPageToTop,
    getTmpLoeRole: function () { return c.tmpLoeRole; },
    clearTmpLoeRole: function () { c.tmpLoeRole = ''; },
    afterSaveSuccess: function (entries) {
      syncEdit();
      c.justRead = entries;
      refreshLoc();
      refreshWhatsNew();
      refreshJobAids();
    },
    afterSaveFailure: function () {
      syncEdit();
    },
    refreshLoc: refreshLoc
  });

  StructureEditService.bind({
    canEdit: function () { return c.canEdit; },
    denyEdit: denyEdit,
    showToast: showToast,
    isContentEditing: ContentEditService.isEditing,
    getMethodologies: function () { return c.methodologies; },
    setMethodologies: function (methodologies) { c.methodologies = methodologies; },
    getMethodologyId: function () { return c.methodologyId; },
    setMethodologyId: function (id) { c.methodologyId = id; },
    getSubPhaseId: function () { return c.subPhaseId; },
    setSubPhaseId: function (id) { c.subPhaseId = id; },
    getView: function () { return c.view; },
    curMeth: curMeth,
    firstContentSubPhase: firstContentSubPhase,
    persistMethodologies: persistMethodologies,
    scrollToEditBar: scrollToEditBar,
    scrollPageToTop: scrollPageToTop,
    refreshLoc: refreshLoc,
    refreshWhatsNew: refreshWhatsNew,
    refreshJobAids: refreshJobAids,
    refreshRgIfRaci: function () {
      if (c.view === 'raci') { refreshRg(); }
    },
    syncRg: syncRg,
    pushNav: pushNav,
    getRgActivePhasesMirror: function () { return c.rgActivePhases; },
    markReadCurrent: function () {
      if (c.loc) { c.justRead = markRead(c.loc.sp); }
    },
    enterContentEdit: function () {
      ContentEditService.enterEdit();
      syncEdit();
      syncStructure();
    },
    afterSaveSuccess: syncStructure
  });

  NavigationService.bind({
    isEditing: isEditing,
    onDenyEditing: denyWhileEditing,
    isLoading: function () { return c.loading; },
    getView: function () { return c.view; },
    setView: function (v) { c.view = v; },
    getMethodologyId: function () { return c.methodologyId; },
    setMethodologyId: function (id) { c.methodologyId = id; },
    getSubPhaseId: function () { return c.subPhaseId; },
    setSubPhaseId: function (id) { c.subPhaseId = id; },
    clearSearch: clearSearch,
    refreshLoc: refreshLoc,
    afterOpenSubPhase: function () {
      c.justRead = c.loc ? markRead(c.loc.sp) : [];
      syncWhatsNew();
    },
    refreshRgIfRaci: function () {
      if (c.view === 'raci') { refreshRg(); }
    },
    findSubPhase: function (id) { return c.findSubPhase(id); },
    firstContentSubPhase: firstContentSubPhase,
    hasContent: hasContent,
    curMeth: curMeth
  });

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
};