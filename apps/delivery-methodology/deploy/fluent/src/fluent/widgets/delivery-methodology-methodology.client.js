api.controller = function ($rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, WhatsNewService, ReferenceService, IconService, JargonService, TipService, ContentEditService, StructureEditService, RaciGridService, UrlPolicyService, SearchService, MessagingService) {
  'use strict';
  var c = this;

  // Drives this widget's own .view-blur while the Shell's search overlay is open - Shell's
  // .search-active class can't reach a sibling widget's DOM (see CLAUDE.md's multi-widget note).
  c.searchOpen = SearchService.isOpen;
  AppStateService.bindActiveView(c, 'methodology');
  TipService.bind(c);
  IconService.bind(c);
  UrlPolicyService.bind(c);
  RaciGridService.bindLegend(c);
  c.phaseColor = MethodologyDomainService.phaseColor;
  c.raciTip = function (letters) {
    if (!letters || !letters.length) {
      return '';
    }
    return letters.map(function (letter) {
      return c.raciNames[letter];
    }).join(' / ');
  };

  // "Explain terms" appears on this view AND on Reference; both drive the ONE JargonService flag
  // (each used to own a separate local boolean, so switching views silently reset the setting).
  // getterSetter reads live from the service every digest rather than mirroring onto `c`, so the
  // other view toggling it can never leave this checkbox stale.
  c.jargonModel = function (value) {
    if (arguments.length) {
      JargonService.setShowJargon(value);
    }
    return JargonService.getShowJargon();
  };
  c.jargonHtml = function (text) {
    return JargonService.jargonHtml(text, JargonService.getShowJargon());
  };

  // Methodology intro panel: expanded until the user collapses it once, then remember collapsed
  // (per methodology) in localStorage. Expanding again updates the preference so it stays open.
  var METHODOLOGY_INTRO_COLLAPSED_KEY = 'gf-dm-methodology-intro-collapsed';

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

  var methodologyIntroCollapsedById = loadCollapsedMap(METHODOLOGY_INTRO_COLLAPSED_KEY);

  c.isMethodologyIntroCollapsed = function (methodologyId) {
    return !!methodologyIntroCollapsedById[methodologyId];
  };

  c.toggleMethodologyIntro = function (methodologyId) {
    if (methodologyIntroCollapsedById[methodologyId]) {
      delete methodologyIntroCollapsedById[methodologyId];
    } else {
      methodologyIntroCollapsedById[methodologyId] = true;
    }
    storeCollapsedMap(METHODOLOGY_INTRO_COLLAPSED_KEY, methodologyIntroCollapsedById);
  };

  c.methodologyIntroParagraphs = function (methodology) {
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
  var subPhaseBriefCollapsedById = loadCollapsedMap(SP_BRIEF_COLLAPSED_KEY);

  c.hasSubPhaseBrief = function (subPhase) {
    return !!(subPhase && (subPhase.overview || subPhase.objective));
  };

  c.isSubPhaseBriefCollapsed = function (subPhaseId) {
    return !!subPhaseBriefCollapsedById[subPhaseId];
  };

  c.toggleSubPhaseBrief = function (subPhaseId) {
    if (subPhaseBriefCollapsedById[subPhaseId]) {
      delete subPhaseBriefCollapsedById[subPhaseId];
    } else {
      subPhaseBriefCollapsedById[subPhaseId] = true;
    }
    storeCollapsedMap(SP_BRIEF_COLLAPSED_KEY, subPhaseBriefCollapsedById);
  };

  function currentMethodology() {
    return MethodologyDomainService.currentMethodology(c.methodologies, c.methodologyId);
  }
  c.currentMethodology = currentMethodology;

  c.hasContent = MethodologyDomainService.hasContent;
  c.jobTitleById = function (jobTitleId) {
    return MethodologyDomainService.jobTitleById(c.jobTitles, jobTitleId);
  };
  c.jobTitleColor = function (jobTitleId) {
    return MethodologyDomainService.jobTitleColor(c.jobTitles, jobTitleId);
  };
  c.sortJobTitleIds = function (jobTitleIds) {
    return MethodologyDomainService.sortJobTitleIds(c.jobTitles, jobTitleIds);
  };
  c.participantsOf = function (subPhase) {
    return MethodologyDomainService.participantsOf(c.jobTitles, subPhase);
  };
  c.unreadCount = function (subPhase) {
    return WhatsNewService.unreadCount(subPhase);
  };
  c.phaseHasUnread = function (phase) {
    return WhatsNewService.phaseHasUnread(phase);
  };
  WhatsNewService.bindFormatters(c);
  c.subPhaseIconPaths = IconService.pathsFor;
  c.jobAidScope = function (task, jobAid) {
    return ReferenceService.jobAidScope(task, jobAid, c.sortJobTitleIds, c.jobTitleById);
  };

  // Phase index for a specific methodology (active uses c.subPhaseId; hidden uses the remembered
  // last visit). Used by the per-methodology ng-show methodology chrome so a hidden
  // methodology's filmstrip stays on the right phase instead of tracking the active
  // methodology's sub-phase.
  c.phaseIndexInMethodology = function (methodology) {
    if (!methodology || !methodology.phases || !methodology.phases.length) {
      return 0;
    }
    var subPhaseId;
    if (methodology.id === c.methodologyId) {
      subPhaseId = c.subPhaseId;
    } else {
      subPhaseId = NavigationService.remembered(methodology.id);
    }
    if (!subPhaseId) {
      return 0;
    }
    for (var phaseIndex = 0; phaseIndex < methodology.phases.length; phaseIndex++) {
      if ((methodology.phases[phaseIndex].subPhases || []).some(function (subPhase) {
        return subPhase.id === subPhaseId;
      })) {
        return phaseIndex;
      }
    }
    return 0;
  };

  c.meetingDisplay = function (meeting) {
    var scheduledBy = null;
    if (meeting.scheduledBy) {
      scheduledBy = c.jobTitleById(meeting.scheduledBy);
    }
    var ledBy = null;
    if (meeting.ledBy) {
      ledBy = c.jobTitleById(meeting.ledBy);
    }
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
    c.location = appState.location;
    c.canEdit = appState.canEdit;
    c.loading = appState.loading;
    c.isSaving = appState.isSaving;
    c.justRead = appState.justRead;
    c.tmpLevelOfEffortRoleId = appState.tmpLevelOfEffortRoleId;
  }
  function syncStructure() {
    var structureState = StructureEditService.readState();
    c.structureEditMode = structureState.structureEditMode;
    c.structureEditUiEnabled = structureState.structureEditUiEnabled;
  }
  function syncEdit() {
    var editState = ContentEditService.readState();
    c.editMode = editState.editMode;
    c.editSubPhase = editState.editSubPhase;
    c.tmpAddJobTitle = editState.tmpAddJobTitle;
  }
  function syncAll() {
    syncAppState();
    syncStructure();
    syncEdit();
  }
  syncAll();
  AppStateService.subscribe($rootScope, $scope, syncAll);

  // One-time "Import Delivery 2.0 content" action offered by the empty-state below when this
  // instance's content table is empty. Guarded by canEdit/isSaving in the template (same as
  // every other write action here) - AppStateService.seedStandard() itself also refuses a
  // double-fire via tryBeginSave(), and the server refuses outright if the table already has
  // rows, so this button cannot clobber existing content no matter how it's triggered.
  c.seedStandard = function () {
    AppStateService.seedStandard();
  };

  // Testing affordance for the empty state / one-click import above: wipes all content so that flow
  // can be run again. Destructive and irreversible (there is no undo - the save path deletes and
  // recreates rows wholesale), hence the confirm, the danger styling, and the structure-edit-only
  // placement rather than a button sitting on the read view. Content edit blocks it for the same
  // reason every other structural write does: a half-finished sub-phase edit would be lost.
  c.resetAllContent = function () {
    if (c.editMode) {
      MessagingService.toast('Finish editing first');
      return;
    }

    MessagingService.confirm({
      title: 'Clear all content?',
      body: 'Deletes every methodology, phase, sub-phase and task on this instance. This cannot be undone - ' +
        'you can import Delivery 2.0 content afterwards.',
      cancel: 'Keep',
      ok: 'Clear everything'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      AppStateService.resetAllContent();
    });
  };

  // Selecting a phase or sub-phase applies INSTANTLY - no animation of any kind on the cards or
  // on the panel content, and no scroll. Several layered attempts at motion here (a whole-page
  // View Transition, then a panel-scoped one, a filmstrip stagger, an entry translate, an animated
  // accent rail, a scroll-into-view) each produced their own visible jump on click. Selection is a
  // high-frequency, precise action taken with the pointer already resting on the target - it wants
  // to feel like nothing moved except the content being replaced. The card's ONLY movement is
  // :hover's lift; the panel just swaps.
  c.selectPhase = function (phaseIndex) {
    NavigationService.selectPhase(phaseIndex);
  };
  c.openSubPhase = function (subPhaseId) {
    NavigationService.openSubPhase(subPhaseId);
  };
  c.jumpTo = function (subPhaseId, methodologyId, elementKey) {
    NavigationService.jumpTo(subPhaseId, methodologyId, elementKey);
  };
  c.onFilmstripCardKeydown = function ($event, subPhase) {
    if ($event.key === 'Enter' || $event.key === ' ') {
      $event.preventDefault();
      c.openSubPhase(subPhase.id);
    }
  };

  c.toggleStructureEdit = function () {
    StructureEditService.toggleStructureEdit();
  };
  c.cancelStructureEdit = function () {
    StructureEditService.cancelStructureEdit();
  };
  c.saveStructureEdit = function () {
    StructureEditService.saveStructureEdit();
  };
  c.renameMethodology = function (methodology) {
    StructureEditService.renameMethodology(methodology);
  };
  c.addMethodology = function () {
    StructureEditService.addMethodology();
  };
  c.methodologyNeedsSetup = function (methodology) {
    return StructureEditService.methodologyNeedsSetup(methodology);
  };
  c.unsettledMethodology = function () {
    return (c.methodologies || []).find(c.methodologyNeedsSetup);
  };
  c.deleteMethodology = function (methodology) {
    StructureEditService.deleteMethodology(methodology);
  };
  c.renamePhase = function (phase) {
    StructureEditService.renamePhase(phase);
  };
  c.renameSubPhase = function (subPhase) {
    StructureEditService.renameSubPhase(subPhase);
  };
  c.addPhase = function (methodology) {
    StructureEditService.addPhase(methodology);
  };
  c.addSubPhase = function (phaseIndex, methodology) {
    StructureEditService.addSubPhase(phaseIndex, methodology);
  };
  c.movePhase = function (index, direction, methodology) {
    StructureEditService.movePhase(index, direction, methodology);
  };
  c.moveSubPhase = function (phaseIndex, index, direction, methodology) {
    StructureEditService.moveSubPhase(phaseIndex, index, direction, methodology);
  };
  c.deletePhase = function (index, methodology) {
    StructureEditService.deletePhase(index, methodology);
  };
  c.deleteSubPhase = function (phaseIndex, index, methodology) {
    StructureEditService.deleteSubPhase(phaseIndex, index, methodology);
  };

  c.enterEdit = function () {
    ContentEditService.enterEdit();
  };
  c.cancelEdit = function () {
    ContentEditService.cancelEdit();
  };
  c.saveEdit = function () {
    ContentEditService.saveEdit();
  };
  c.participantOn = function (roleId) {
    return ContentEditService.participantOn(roleId);
  };
  c.toggleParticipant = function (roleId) {
    ContentEditService.toggleParticipant(roleId);
  };
  c.idleParticipants = function () {
    return ContentEditService.idleParticipants();
  };
  c.addListItem = function (kind) {
    ContentEditService.addListItem(kind);
  };
  c.removeListItem = function (kind, index) {
    ContentEditService.removeListItem(kind, index);
  };
  c.moveListItem = function (kind, index, direction) {
    ContentEditService.moveListItem(kind, index, direction);
  };
  c.setLoeMode = function (mode) {
    ContentEditService.setLoeMode(mode);
  };
  c.loeAvailableRoles = function () {
    return ContentEditService.loeAvailableRoles();
  };
  c.addLoeRole = function () {
    AppStateService.setTmpLevelOfEffortRoleId(c.tmpLevelOfEffortRoleId);
    ContentEditService.addLoeRole();
  };
  c.removeLoeRole = function (roleId) {
    ContentEditService.removeLoeRole(roleId);
  };
  c.setLoeFlag = function (entry, value) {
    ContentEditService.setLoeFlag(entry, value);
  };
  c.loeRoleOrphan = function (roleId) {
    return ContentEditService.loeRoleOrphan(roleId);
  };
  c.loeRoleRows = function () {
    return ContentEditService.loeRoleRows();
  };
  c.addMeeting = function () {
    ContentEditService.addMeeting();
  };
  c.removeMeeting = function (index) {
    ContentEditService.removeMeeting(index);
  };
  c.moveMeeting = function (index, direction) {
    ContentEditService.moveMeeting(index, direction);
  };
  c.internalRoles = function () {
    return ContentEditService.internalRoles();
  };
  c.meetingPersonOrphan = function (roleId) {
    return ContentEditService.meetingPersonOrphan(roleId);
  };
  c.addTask = function () {
    ContentEditService.addTask();
  };
  c.removeTask = function (index) {
    ContentEditService.removeTask(index);
  };
  c.moveTask = function (index, direction) {
    ContentEditService.moveTask(index, direction);
  };
  c.taskRaciRoles = function (task) {
    return ContentEditService.taskRaciRoles(task);
  };
  c.taskRoleOrphan = function (roleId) {
    return ContentEditService.taskRoleOrphan(roleId);
  };
  c.taskAvailableRoles = function (task) {
    return ContentEditService.taskAvailableRoles(task);
  };
  c.taskCoreTeamMissing = function (task) {
    return ContentEditService.taskCoreTeamMissing(task);
  };
  c.toggleRaci = function (task, roleId, letter) {
    ContentEditService.toggleRaci(task, roleId, letter);
  };
  c.removeTaskRole = function (task, roleId) {
    ContentEditService.removeTaskRole(task, roleId);
  };
  c.addTaskRole = function (task, roleId) {
    ContentEditService.addTaskRole(task, roleId);
  };
  c.addJobAid = function (task) {
    ContentEditService.addJobAid(task);
  };
  c.removeJobAid = function (task, index) {
    ContentEditService.removeJobAid(task, index);
  };
  c.toggleJobAidRole = function (task, jobAid, roleId) {
    ContentEditService.toggleJobAidRole(task, jobAid, roleId);
  };
  c.jobAidRoleOn = function (task, jobAid, roleId) {
    return ContentEditService.jobAidRoleOn(task, jobAid, roleId);
  };
};