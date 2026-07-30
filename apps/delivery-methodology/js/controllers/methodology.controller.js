/* Delivery Methodology "Methodology" widget: filmstrip, sub-phase read view, content edit mode,
   and structure edit mode. Visible only when AppState.view === 'methodology' (see isActiveView).
   Shell owns the one ContentEditService.bind() / StructureEditService.bind() call and the tip/
   toast/confirm/search chrome - this controller only reads those services' state and calls their
   action methods; see shell.controller.js's header comment and AppStateService's for why
   $rootScope.$on('dm-state', ...) is how this stays in sync with sibling widgets. */
angular.module('deliveryMethodology').controller('DmMethodologyController', [
  '$rootScope', '$scope', '$timeout', 'AppStateService', 'MethodologyDomainService', 'NavigationService', 'WhatsNewService',
  'ReferenceService', 'IconService', 'JargonService', 'TipService', 'ContentEditService', 'StructureEditService',
  'RaciGridService', 'UrlPolicyService', 'SearchService', 'MotionService',
  function (
    $rootScope, $scope, $timeout, AppStateService, MethodologyDomainService, NavigationService, WhatsNewService,
    ReferenceService, IconService, JargonService, TipService, ContentEditService, StructureEditService,
    RaciGridService, UrlPolicyService, SearchService, MotionService
  ) {
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
      if (methodology.phases[phaseIndex].subPhases.some(function (subPhase) {
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

  // Is the panel far enough down that selecting a sub-phase would change only off-screen content?
  // Measured BEFORE the swap, because the answer decides which of two mutually exclusive motions
  // runs (see openPanelContent) - and the panel's top edge is set by the chrome above it, which
  // the swap does not move, so a pre-measurement stays valid.
  function panelNeedsReveal() {
    var panel = document.querySelector('.panel');

    if (!panel) {
      return false;
    }

    var top = panel.getBoundingClientRect().top;
    return !(top >= 0 && top < window.innerHeight * 0.5);
  }

  // Picking a phase station or filmstrip card swaps the detail panel, but that panel starts below
  // the fold on a normal desktop viewport (measured: panel top ~942px against a 720px viewport,
  // with the About intro and roadmap above it), so the click appeared to do nothing.
  function revealPanel() {
    $timeout(function () {
      var panel = document.querySelector('.panel');

      if (!panel) {
        return;
      }

      panel.scrollIntoView({
        behavior: MotionService.prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });
    }, 0);
  }

  // Exactly ONE of the two motions runs per selection, never both: a View Transition crossfades a
  // before/after snapshot of the page, so running it while a smooth scroll is mid-flight would
  // crossfade two different scroll positions and read as a slide. When the panel is off-screen the
  // scroll IS the continuity cue (it shows you where the content went), so the crossfade is
  // redundant; when the panel is already in view there is no scroll, and the crossfade is the only
  // thing signalling that the content underneath changed.
  function openPanelContent(applyNavigation) {
    if (panelNeedsReveal()) {
      applyNavigation();
      revealPanel();
      return false;
    }

    MotionService.transition(applyNavigation);
    return true;
  }

  // Replays the filmstrip's stagger. Needed because every phase's strip stays mounted and is only
  // ng-show/ng-hidden (the template keeps them all built on purpose), so the cards are never
  // recreated - and, verified empirically, a display:none → visible flip does NOT restart their
  // CSS animation the way creating the element would. Re-running the existing animation objects is
  // cleaner than the usual remove-class/force-reflow/re-add-class trick and needs no extra class.
  function restageFilmstrip() {
    if (MotionService.prefersReducedMotion()) {
      return;
    }

    $timeout(function () {
      var cards = document.querySelectorAll('.methodology-chrome:not(.ng-hide) .film:not(.ng-hide) .fcard');
      var index;

      for (index = 0; index < cards.length; index++) {
        if (typeof cards[index].getAnimations !== 'function') {
          return;
        }

        cards[index].getAnimations().forEach(function (animation) {
          if (animation.animationName === 'dmCardIn') {
            animation.cancel();
            animation.play();
          }
        });
      }
    }, 0);
  }

  // Only selectPhase swaps which SET of cards is on screen (openSubPhase just moves the .on
  // marker), so the restage belongs here alone - and only on the scroll path, since the crossfade
  // path already animates the card set changing as part of the whole-page transition. One motion
  // per interaction, same either/or rule openPanelContent uses for scroll vs crossfade.
  c.selectPhase = function (phaseIndex) {
    var crossfaded = openPanelContent(function () {
      NavigationService.selectPhase(phaseIndex);
    });

    if (!crossfaded) {
      restageFilmstrip();
    }
  };
  c.openSubPhase = function (subPhaseId) {
    openPanelContent(function () {
      NavigationService.openSubPhase(subPhaseId);
    });
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
  c.deleteMethodology = function () {
    StructureEditService.deleteMethodology();
  };
  c.renamePhase = function (phase) {
    StructureEditService.renamePhase(phase);
  };
  c.renameSubPhase = function (subPhase) {
    StructureEditService.renameSubPhase(subPhase);
  };
  c.addPhase = function () {
    StructureEditService.addPhase();
  };
  c.addSubPhase = function (phaseIndex) {
    StructureEditService.addSubPhase(phaseIndex);
  };
  c.movePhase = function (index, direction) {
    StructureEditService.movePhase(index, direction);
  };
  c.moveSubPhase = function (phaseIndex, index, direction) {
    StructureEditService.moveSubPhase(phaseIndex, index, direction);
  };
  c.deletePhase = function (index) {
    StructureEditService.deletePhase(index);
  };
  c.deleteSubPhase = function (phaseIndex, index) {
    StructureEditService.deleteSubPhase(phaseIndex, index);
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
}]);
