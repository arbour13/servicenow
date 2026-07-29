api.controller = function (
    $rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, WhatsNewService,
    ReferenceService, IconService, JargonService, TipService, ContentEditService, StructureEditService
  ) {
  'use strict';
  var c = this;

  c.isActiveView = function () {
    return !AppStateService.getLoading() && AppStateService.getView() === 'methodology';
  };

  c.tip = TipService.tip;
  c.tipMouseOver = function ($event) { TipService.tipMouseOver($event); };
  c.tipMouseOut = function ($event) { TipService.tipMouseOut($event); };
  c.dismissTip = function () { TipService.dismissTip(); };

  // CSS var references (not literal hexes) so every inline style="--nc/--pc: ..." binding and
  // ng-style="{background: ...}" swatch that consumes these stays theme-aware.
  var PHASE_COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--p5)'];
  c.phaseColor = function (i) { return PHASE_COLORS[i % PHASE_COLORS.length]; };

  c.raciLetters = ['R', 'A', 'C', 'I'];
  c.raciNames = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };
  c.raciHex = { R: '#01cc52', A: '#e5c20b', C: '#3ec2f8', I: '#bdc2cb' };
  c.raciTip = function (letters) {
    if (!letters || !letters.length) {
      return '';
    }
    return letters.map(function (letter) { return c.raciNames[letter]; }).join(' / ');
  };

  c.showJargon = false;
  c.jargonHtml = function (text) { return JargonService.jargonHtml(text, c.showJargon); };

  // Methodology intro panel: expanded until the user collapses it once, then remember collapsed
  // (per methodology) in localStorage. Expanding again updates the preference so it stays open.
  var METH_INTRO_COLLAPSED_KEY = 'gf-dm-meth-intro-collapsed';

  function loadCollapsedMap(key) {
    try {
      var raw = window.localStorage.getItem(key);
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

  function storeCollapsedMap(key, map) {
    try {
      window.localStorage.setItem(key, JSON.stringify(map));
    } catch (storeError) {
      /* storage unavailable - preference is session-only */
    }
  }

  var methIntroCollapsedById = loadCollapsedMap(METH_INTRO_COLLAPSED_KEY);

  c.isMethIntroCollapsed = function (methodologyId) {
    return !!methIntroCollapsedById[methodologyId];
  };

  c.toggleMethIntro = function (methodologyId) {
    if (methIntroCollapsedById[methodologyId]) {
      delete methIntroCollapsedById[methodologyId];
    } else {
      methIntroCollapsedById[methodologyId] = true;
    }
    storeCollapsedMap(METH_INTRO_COLLAPSED_KEY, methIntroCollapsedById);
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
  var spBriefCollapsedById = loadCollapsedMap(SP_BRIEF_COLLAPSED_KEY);

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
    storeCollapsedMap(SP_BRIEF_COLLAPSED_KEY, spBriefCollapsedById);
  };

  function curMeth() {
    return MethodologyDomainService.curMeth(c.methodologies, c.methodologyId);
  }
  c.curMeth = curMeth;

  c.hasContent = MethodologyDomainService.hasContent;
  c.jobTitleById = function (id) { return MethodologyDomainService.jobTitleById(c.jobTitles, id); };
  c.jobTitleColor = function (id) { return MethodologyDomainService.jobTitleColor(c.jobTitles, id); };
  c.sortJobTitleIds = function (ids) { return MethodologyDomainService.sortJobTitleIds(c.jobTitles, ids); };
  c.participantsOf = function (sp) { return MethodologyDomainService.participantsOf(c.jobTitles, sp); };
  c.unreadCount = function (sp) { return WhatsNewService.unreadCount(sp); };
  c.phaseHasUnread = function (p) { return WhatsNewService.phaseHasUnread(p); };
  c.fmtDate = function (d) { return WhatsNewService.fmtDate(d); };
  c.icon = IconService.paths;
  c.subPhaseIconPaths = function (sp) { return IconService.pathsFor(sp); };
  c.jobAidScope = function (t, j) { return ReferenceService.jobAidScope(t, j, c.sortJobTitleIds, c.jobTitleById); };

  // Phase index for a specific methodology (active uses c.subPhaseId; hidden uses the remembered
  // last visit). Used by the per-methodology ng-show methodology chrome so a hidden meth's filmstrip
  // stays on the right phase instead of tracking the active meth's sub-phase.
  c.phaseIndexInMeth = function (methodology) {
    if (!methodology || !methodology.phases || !methodology.phases.length) {
      return 0;
    }
    var subId;
    if (methodology.id === c.methodologyId) {
      subId = c.subPhaseId;
    } else {
      subId = NavigationService.remembered(methodology.id);
    }
    if (!subId) {
      return 0;
    }
    for (var phaseIndex = 0; phaseIndex < methodology.phases.length; phaseIndex++) {
      if (methodology.phases[phaseIndex].subPhases.some(function (subPhase) {
        return subPhase.id === subId;
      })) {
        return phaseIndex;
      }
    }
    return 0;
  };

  c.meetingDisplay = function (meeting) {
    var scheduledBy = meeting.scheduledBy ? c.jobTitleById(meeting.scheduledBy) : null;
    var ledBy = meeting.ledBy ? c.jobTitleById(meeting.ledBy) : null;
    var bits = [];
    if (scheduledBy) {
      bits.push('Scheduled by ' + scheduledBy.abbr);
    }
    if (ledBy) {
      bits.push('Led by ' + ledBy.abbr);
    }
    return {
      name: meeting.name,
      meta: bits.join(' · '),
      external: meeting.external
    };
  };

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
    c.methodologyId = appState.methodologyId;
    c.subPhaseId = appState.subPhaseId;
    c.loc = appState.loc;
    c.canEdit = appState.canEdit;
    c.loading = appState.loading;
    c.isSaving = appState.isSaving;
    c.justRead = appState.justRead;
    c.tmpLoeRole = appState.tmpLoeRole;
  }
  function syncStructure() {
    var structureState = StructureEditService.readState();
    c.structureEditMode = structureState.structureEditMode;
    c.structureEditUiEnabled = structureState.structureEditUiEnabled;
  }
  function syncEdit() {
    var editState = ContentEditService.readState();
    c.editMode = editState.editMode;
    c.editSp = editState.editSp;
    c.tmpAddJt = editState.tmpAddJt;
  }
  function syncAll() {
    syncAppState();
    syncStructure();
    syncEdit();
  }
  syncAll();
  var unsubscribeDmState = $rootScope.$on('dm-state', syncAll);
  $scope.$on('$destroy', unsubscribeDmState);

  c.selectPhase = function (phaseIndex) { NavigationService.selectPhase(phaseIndex); };
  c.openSubPhase = function (id) { NavigationService.openSubPhase(id); };
  c.jumpTo = function (subId, methId, elKey) { NavigationService.jumpTo(subId, methId, elKey); };
  c.fcardKey = function ($event, s) {
    if ($event.key === 'Enter' || $event.key === ' ') {
      $event.preventDefault();
      c.openSubPhase(s.id);
    }
  };

  c.toggleStructureEdit = function () { StructureEditService.toggleStructureEdit(); };
  c.cancelStructureEdit = function () { StructureEditService.cancelStructureEdit(); };
  c.saveStructureEdit = function () { StructureEditService.saveStructureEdit(); };
  c.renameMethodology = function (methodology) { StructureEditService.renameMethodology(methodology); };
  c.addMethodology = function () { StructureEditService.addMethodology(); };
  c.deleteMethodology = function () { StructureEditService.deleteMethodology(); };
  c.renamePhase = function (phase) { StructureEditService.renamePhase(phase); };
  c.renameSubPhase = function (sp) { StructureEditService.renameSubPhase(sp); };
  c.addPhase = function () { StructureEditService.addPhase(); };
  c.addSubPhase = function (phaseIndex) { StructureEditService.addSubPhase(phaseIndex); };
  c.movePhase = function (index, dir) { StructureEditService.movePhase(index, dir); };
  c.moveSubPhase = function (phaseIndex, index, dir) { StructureEditService.moveSubPhase(phaseIndex, index, dir); };
  c.deletePhase = function (index) { StructureEditService.deletePhase(index); };
  c.deleteSubPhase = function (phaseIndex, index) { StructureEditService.deleteSubPhase(phaseIndex, index); };

  c.enterEdit = function () { ContentEditService.enterEdit(); };
  c.cancelEdit = function () { ContentEditService.cancelEdit(); };
  c.saveEdit = function () { ContentEditService.saveEdit(); };
  c.participantOn = function (id) { return ContentEditService.participantOn(id); };
  c.toggleParticipant = function (id) { ContentEditService.toggleParticipant(id); };
  c.idleParticipants = function () { return ContentEditService.idleParticipants(); };
  c.addListItem = function (kind) { ContentEditService.addListItem(kind); };
  c.removeListItem = function (kind, index) { ContentEditService.removeListItem(kind, index); };
  c.moveListItem = function (kind, index, dir) { ContentEditService.moveListItem(kind, index, dir); };
  c.setLoeMode = function (mode) { ContentEditService.setLoeMode(mode); };
  c.loeAvailableRoles = function () { return ContentEditService.loeAvailableRoles(); };
  c.addLoeRole = function () {
    AppStateService.setTmpLoeRole(c.tmpLoeRole);
    ContentEditService.addLoeRole();
  };
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
  c.toggleJobAidRole = function (task, jobAid, roleId) { ContentEditService.toggleJobAidRole(task, jobAid, roleId); };
  c.jobAidRoleOn = function (task, jobAid, roleId) { return ContentEditService.jobAidRoleOn(task, jobAid, roleId); };
};